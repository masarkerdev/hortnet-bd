// ============================================================
// backend/routes/reports.js — Center App রিপোর্ট routes
// existing কোনো ফাইল edit হয় নাই।
// fy = INTEGER (যেমন 2025 মানে অর্থবছর ২০২৫-২৬)
//
// Data sources (existing tables, verified against actual schema):
//   উৎপাদন → production_batches (sowing_date/propagation_date + produced_quantity)
//   বিতরণ  → stock_transactions (txn_type='sale')
//   মৃত/বিনষ্ট → damages (damage_date + quantity)
//   পূর্ব বছরের জের → stock_transactions (txn_type='opening_balance', প্রথম entry FY-এর মধ্যে)
//   নীট মজুদ → seedlings.current_stock (source of truth)
// ============================================================

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { MOTHER_CATEGORIES } = require("./reports_shared");

const getCurrentFY = () => {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
};
const getFYDates = (fy) => {
  const f = parseInt(fy) || getCurrentFY();
  return { start: `${f}-07-01`, end: `${f + 1}-06-30`, fy: f };
};
const monthCalendarYear = (fy, month) => (month >= 7 ? fy : fy + 1);
const pad2 = (n) => String(n).padStart(2, "0");
const toClass = (pt) => (pt === "seed" ? "চারা" : pt === "purchase" ? "ক্রয়" : "কলম");

router.get("/topsheet", authenticate, async (req, res) => {
  const { fy: fyParam, month: monthParam } = req.query;
  const { start: fyStart, fy } = getFYDates(fyParam);

  const now = new Date();
  const month = parseInt(monthParam) || now.getMonth() + 1;
  const calYear = monthCalendarYear(fy, month);
  const monthStart = `${calYear}-${pad2(month)}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthCalYear = month === 12 ? calYear + 1 : calYear;
  const monthEndExclusive = `${nextMonthCalYear}-${pad2(nextMonth)}-01`;

  try {
    const targetRows = await db.query(
      `SELECT target_type, target_quantity FROM targets
       WHERE target_type LIKE 'category_%' AND target_year = $1 AND target_month = 0`,
      [fy]
    );
    const targetMap = {};
    targetRows.rows.forEach((r) => (targetMap[r.target_type] = Number(r.target_quantity)));

    // উৎপাদন — চলতি মাস (production_batches, propagation_date না থাকলে sowing_date/created_at ব্যবহার)
    const prodCurrent = await db.query(
      `SELECT c.base_group, pb.production_type, COALESCE(SUM(pb.produced_quantity),0) AS qty
       FROM production_batches pb
       JOIN seedlings s ON pb.seedling_id = s.id
       JOIN categories c ON s.category_id = c.id
       WHERE COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date) >= $1
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date) < $2
       GROUP BY c.base_group, pb.production_type`,
      [monthStart, monthEndExclusive]
    );

    // উৎপাদন — পূর্বমাস পর্যন্ত (FY শুরু থেকে চলতি মাস শুরুর আগ পর্যন্ত)
    const prodPrevMonths = await db.query(
      `SELECT c.base_group, pb.production_type, COALESCE(SUM(pb.produced_quantity),0) AS qty
       FROM production_batches pb
       JOIN seedlings s ON pb.seedling_id = s.id
       JOIN categories c ON s.category_id = c.id
       WHERE COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date) >= $1
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date) < $2
       GROUP BY c.base_group, pb.production_type`,
      [fyStart, monthStart]
    );

    // বিতরণ — চলতি মাস (stock_transactions, txn_type='sale')
    const distCurrent = await db.query(
      `SELECT c.base_group, s.production_type, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st
       JOIN seedlings s ON st.seedling_id = s.id
       JOIN categories c ON s.category_id = c.id
       WHERE st.txn_type = 'sale' AND st.created_at >= $1 AND st.created_at < $2
       GROUP BY c.base_group, s.production_type`,
      [monthStart, monthEndExclusive]
    );

    // বিতরণ — পূর্বমাস পর্যন্ত
    const distPrevMonths = await db.query(
      `SELECT c.base_group, s.production_type, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st
       JOIN seedlings s ON st.seedling_id = s.id
       JOIN categories c ON s.category_id = c.id
       WHERE st.txn_type = 'sale' AND st.created_at >= $1 AND st.created_at < $2
       GROUP BY c.base_group, s.production_type`,
      [fyStart, monthStart]
    );

    // মৃত/বিনষ্ট — FY শুরু থেকে চলতি মাসের শেষ পর্যন্ত (damages টেবিল থেকে, cumulative)
    const damageRows = await db.query(
      `SELECT c.base_group, s.production_type, COALESCE(SUM(d.quantity),0) AS qty
       FROM damages d
       JOIN seedlings s ON d.seedling_id = s.id
       JOIN categories c ON s.category_id = c.id
       WHERE d.damage_date >= $1 AND d.damage_date < $2
       GROUP BY c.base_group, s.production_type`,
      [fyStart, monthEndExclusive]
    );

    // পূর্ব বছরের জের — FY শুরুর আগের সর্বশেষ opening_balance/stock_transactions balance
    const prevYearBalance = await db.query(
      `SELECT c.base_group, s.production_type, COALESCE(SUM(latest.balance_after),0) AS qty
       FROM seedlings s
       JOIN categories c ON s.category_id = c.id
       LEFT JOIN LATERAL (
         SELECT balance_after FROM stock_transactions st
         WHERE st.seedling_id = s.id AND st.created_at < $1
         ORDER BY st.created_at DESC LIMIT 1
       ) latest ON true
       GROUP BY c.base_group, s.production_type`,
      [fyStart]
    );

    // নীট মজুদ — current_stock (source of truth)
    const netStock = await db.query(
      `SELECT c.base_group, s.production_type, COALESCE(SUM(s.current_stock),0) AS qty
       FROM seedlings s
       JOIN categories c ON s.category_id = c.id
       WHERE s.is_active = true
       GROUP BY c.base_group, s.production_type`
    );

    const findQty = (rows, baseGroup, propClass) => {
      const row = rows.find((r) => (r.base_group||'').trim() === baseGroup && toClass(r.production_type) === propClass);
      return row ? Number(row.qty) : 0;
    };

    const report = MOTHER_CATEGORIES.map((mc) => {
      const targetType = "category_" + mc.name_bn.replace(/\s+/g, "_");
      const target = targetMap[targetType] || 0;

      const prodCur = findQty(prodCurrent.rows, mc.base_group, mc.propagation_class);
      const prodPrev = findQty(prodPrevMonths.rows, mc.base_group, mc.propagation_class);
      const prodTotal = prodCur + prodPrev;
      const daeIn = 0;
      const prevYearJer = findQty(prevYearBalance.rows, mc.base_group, mc.propagation_class);
      const prodGrandTotal = prodTotal + daeIn + prevYearJer;

      const distCur = findQty(distCurrent.rows, mc.base_group, mc.propagation_class);
      const distPrev = findQty(distPrevMonths.rows, mc.base_group, mc.propagation_class);
      const distTotal = distCur + distPrev;
      const daeOut = 0;
      const damaged = findQty(damageRows.rows, mc.base_group, mc.propagation_class);
      const distGrandTotal = distTotal + daeOut + damaged;

      const netStockQty = findQty(netStock.rows, mc.base_group, mc.propagation_class);

      return {
        display_order: mc.order,
        mother_category: mc.name_bn,
        divisional_target: target,
        production: {
          current_month: prodCur, prev_months_total: prodPrev, subtotal: prodTotal,
          dae_challan_received: daeIn, prev_year_balance: prevYearJer, grand_total: prodGrandTotal,
        },
        distribution: {
          target, current_month: distCur, prev_months_total: distPrev, subtotal: distTotal,
          dae_challan_sent: daeOut, damaged, grand_total: distGrandTotal,
        },
        net_stock: netStockQty,
      };
    });

    res.json({ success: true, fy: `${fy}-${String(fy + 1).slice(-2)}`, month, data: report });
  } catch (err) {
    console.error("topsheet report error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/category-detail", authenticate, async (req, res) => {
  const { mother_category, fy: fyParam, month: monthParam } = req.query;
  const mc = MOTHER_CATEGORIES.find((m) => m.name_bn === mother_category);
  if (!mc) {
    return res.status(400).json({ success: false, message: "সঠিক mother_category নাম দিন।" });
  }
  const { start: fyStart, fy } = getFYDates(fyParam);
  const now = new Date();
  const month = parseInt(monthParam) || now.getMonth() + 1;
  const calYear = monthCalendarYear(fy, month);
  const monthStart = `${calYear}-${pad2(month)}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthCalYear = month === 12 ? calYear + 1 : calYear;
  const monthEndExclusive = `${nextMonthCalYear}-${pad2(nextMonth)}-01`;

  try {
    const toClassSql =
      mc.propagation_class === "চারা" ? "s.production_type = 'seed'" :
      mc.propagation_class === "ক্রয়" ? "s.production_type = 'purchase'" :
      "s.production_type NOT IN ('seed','purchase')";

    // সব seedling (item/variety) এই mother_category-র আওতায়
    const seedlings = await db.query(
      `SELECT s.id AS seedling_id, c.name_bn AS common_name, s.variety, s.current_stock
       FROM seedlings s
       JOIN categories c ON s.category_id = c.id
       WHERE c.base_group = $1 AND s.is_active = true AND ${toClassSql}
       ORDER BY c.name_bn, s.variety`,
      [mc.base_group]
    );

    const prodCur = await db.query(
      `SELECT pb.seedling_id, COALESCE(SUM(pb.produced_quantity),0) AS qty
       FROM production_batches pb JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.base_group=$1 AND ${toClassSql}
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$2
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$3
       GROUP BY pb.seedling_id`, [mc.base_group, monthStart, monthEndExclusive]);

    const prodPrev = await db.query(
      `SELECT pb.seedling_id, COALESCE(SUM(pb.produced_quantity),0) AS qty
       FROM production_batches pb JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.base_group=$1 AND ${toClassSql}
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$2
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$3
       GROUP BY pb.seedling_id`, [mc.base_group, fyStart, monthStart]);

    const distCur = await db.query(
      `SELECT st.seedling_id, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.base_group=$1 AND ${toClassSql} AND st.txn_type='sale' AND st.created_at>=$2 AND st.created_at<$3
       GROUP BY st.seedling_id`, [mc.base_group, monthStart, monthEndExclusive]);

    const distPrev = await db.query(
      `SELECT st.seedling_id, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.base_group=$1 AND ${toClassSql} AND st.txn_type='sale' AND st.created_at>=$2 AND st.created_at<$3
       GROUP BY st.seedling_id`, [mc.base_group, fyStart, monthStart]);

    const damageRows = await db.query(
      `SELECT d.seedling_id, COALESCE(SUM(d.quantity),0) AS qty
       FROM damages d JOIN seedlings s ON d.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.base_group=$1 AND ${toClassSql} AND d.damage_date>=$2 AND d.damage_date<$3
       GROUP BY d.seedling_id`, [mc.base_group, fyStart, monthEndExclusive]);

    const prevYearBal = await db.query(
      `SELECT s.id AS seedling_id, COALESCE(latest.balance_after,0) AS qty
       FROM seedlings s JOIN categories c ON s.category_id=c.id
       LEFT JOIN LATERAL (
         SELECT balance_after FROM stock_transactions st WHERE st.seedling_id=s.id AND st.created_at<$2
         ORDER BY st.created_at DESC LIMIT 1
       ) latest ON true
       WHERE c.base_group=$1 AND ${toClassSql}`, [mc.base_group, fyStart]);

    const findQty = (rows, id) => { const r = rows.find(x=>x.seedling_id===id); return r ? Number(r.qty) : 0; };

    const data = seedlings.rows.map(sd => {
      const pCur = findQty(prodCur.rows, sd.seedling_id);
      const pPrev = findQty(prodPrev.rows, sd.seedling_id);
      const pJer = findQty(prevYearBal.rows, sd.seedling_id);
      const dCur = findQty(distCur.rows, sd.seedling_id);
      const dPrev = findQty(distPrev.rows, sd.seedling_id);
      const dmg = findQty(damageRows.rows, sd.seedling_id);
      return {
        common_name: sd.common_name,
        variety: sd.variety,
        current_stock: sd.current_stock,
        production: { current_month: pCur, prev_months_total: pPrev, subtotal: pCur+pPrev, prev_year_balance: pJer, grand_total: pCur+pPrev+pJer },
        distribution: { current_month: dCur, prev_months_total: dPrev, subtotal: dCur+dPrev, damaged: dmg, grand_total: dCur+dPrev+dmg },
      };
    });

    res.json({ success: true, mother_category, fy: `${fy}-${String(fy+1).slice(-2)}`, month, data });
  } catch (err) {
    console.error("category-detail error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
