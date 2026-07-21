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
const toClass = (pt) =>
  pt === "seed" ? "চারা" : pt === "purchase" ? "ক্রয়" : "কলম";

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
      [fy],
    );
    const targetMap = {};
    targetRows.rows.forEach(
      (r) => (targetMap[r.target_type] = Number(r.target_quantity)),
    );

    // ক্যাটাগরি নাম অনুযায়ী সরাসরি group — production_type অনুমান না করে
    const prodQtyExpr =
      "CASE WHEN pb.production_type='seed' THEN pb.produced_quantity ELSE COALESCE(pb.success_quantity, pb.produced_quantity) END";
    const prodCurrent = await db.query(
      `SELECT c.name_bn, COALESCE(SUM(${prodQtyExpr}),0) AS qty
       FROM production_batches pb JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$1 AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$2
       GROUP BY c.name_bn`,
      [monthStart, monthEndExclusive],
    );

    const prodPrevMonths = await db.query(
      `SELECT c.name_bn, COALESCE(SUM(${prodQtyExpr}),0) AS qty
       FROM production_batches pb JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$1 AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$2
       GROUP BY c.name_bn`,
      [fyStart, monthStart],
    );

    const distCurrent = await db.query(
      `SELECT c.name_bn, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE st.txn_type='sale' AND st.created_at>=$1 AND st.created_at<$2
       GROUP BY c.name_bn`,
      [monthStart, monthEndExclusive],
    );

    const distPrevMonths = await db.query(
      `SELECT c.name_bn, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE st.txn_type='sale' AND st.created_at>=$1 AND st.created_at<$2
       GROUP BY c.name_bn`,
      [fyStart, monthStart],
    );

    const damageRows = await db.query(
      `SELECT c.name_bn, COALESCE(SUM(d.quantity),0) AS qty
       FROM damages d JOIN seedlings s ON d.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE d.damage_date>=$1 AND d.damage_date<$2
       GROUP BY c.name_bn`,
      [fyStart, monthEndExclusive],
    );

    const prevYearBalance = await db.query(
      `SELECT c.name_bn, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st
       JOIN seedlings s ON st.seedling_id=s.id
       JOIN categories c ON s.category_id=c.id
       WHERE st.txn_type='opening_balance'
       GROUP BY c.name_bn`,
    );

    const netStock = await db.query(
      `SELECT c.name_bn, COALESCE(SUM(s.current_stock),0) AS qty
       FROM seedlings s JOIN categories c ON s.category_id=c.id WHERE s.is_active=true
       GROUP BY c.name_bn`,
    );

    const findQty = (rows, catName) => {
      const row = rows.find((r) => r.name_bn === catName);
      return row ? Number(row.qty) : 0;
    };

    const report = MOTHER_CATEGORIES.map((mc) => {
      const targetType = "category_" + mc.name_bn.replace(/\s+/g, "_");
      const target = targetMap[targetType] || 0;

      const prodCur = findQty(prodCurrent.rows, mc.name_bn);
      const prodPrev = findQty(prodPrevMonths.rows, mc.name_bn);
      const prodTotal = prodCur + prodPrev;
      const daeIn = 0;
      const prevYearJer = findQty(prevYearBalance.rows, mc.name_bn);
      const prodGrandTotal = prodTotal + daeIn + prevYearJer;

      const distCur = findQty(distCurrent.rows, mc.name_bn);
      const distPrev = findQty(distPrevMonths.rows, mc.name_bn);
      const distTotal = distCur + distPrev;
      const daeOut = 0;
      const damaged = findQty(damageRows.rows, mc.name_bn);
      const distGrandTotal = distTotal + daeOut + damaged;

      const netStockQty = findQty(netStock.rows, mc.name_bn);

      return {
        display_order: mc.order,
        mother_category: mc.name_bn,
        divisional_target: target,
        production: {
          current_month: prodCur,
          prev_months_total: prodPrev,
          subtotal: prodTotal,
          dae_challan_received: daeIn,
          prev_year_balance: prevYearJer,
          grand_total: prodGrandTotal,
        },
        distribution: {
          target,
          current_month: distCur,
          prev_months_total: distPrev,
          subtotal: distTotal,
          dae_challan_sent: daeOut,
          damaged,
          grand_total: distGrandTotal,
        },
        net_stock: netStockQty,
      };
    });

    res.json({
      success: true,
      fy: `${fy}-${String(fy + 1).slice(-2)}`,
      month,
      data: report,
    });
  } catch (err) {
    console.error("topsheet report error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/target-summary?fy=2026 — মোট লক্ষ্যমাত্রা vs অর্জিত (Center App-এর জন্য)
router.get("/target-summary", authenticate, async (req, res) => {
  const { fy: fyParam } = req.query;
  const { start: fyStart, end: fyEnd, fy } = getFYDates(fyParam);
  try {
    const targetRows = await db.query(
      `SELECT COALESCE(SUM(target_quantity),0) AS total FROM targets
       WHERE target_type LIKE 'category_%' AND target_year=$1 AND target_month=0`,
      [fy],
    );
    const achievedRows = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN production_type='seed' THEN produced_quantity ELSE COALESCE(success_quantity,produced_quantity) END),0) AS total FROM production_batches
       WHERE COALESCE(propagation_date, sowing_date, created_at::date) >= $1
         AND COALESCE(propagation_date, sowing_date, created_at::date) <= $2`,
      [fyStart, fyEnd],
    );
    res.json({
      success: true,
      fy: `${fy}-${String(fy + 1).slice(-2)}`,
      target: Number(targetRows.rows[0].total),
      achieved: Number(achievedRows.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/category-detail", authenticate, async (req, res) => {
  const { mother_category, fy: fyParam, month: monthParam } = req.query;
  const mc = MOTHER_CATEGORIES.find((m) => m.name_bn === mother_category);
  if (!mc) {
    return res
      .status(400)
      .json({ success: false, message: "সঠিক mother_category নাম দিন।" });
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
    // category নাম সরাসরি mother_category-র সাথে মেলাই (production_type-এর উপর নির্ভর না করে,
    // কারণ Center Admin category নির্বাচনের মাধ্যমে ইচ্ছাকৃতভাবে চারা/কলম ঠিক করে)
    const seedlings = await db.query(
      `SELECT s.id AS seedling_id, s.name_bn AS common_name, s.variety, s.current_stock
       FROM seedlings s
       JOIN categories c ON s.category_id = c.id
       WHERE c.name_bn = $1 AND s.is_active = true
       ORDER BY s.name_bn, s.variety`,
      [mother_category],
    );

    const prodCur = await db.query(
      `SELECT pb.seedling_id, COALESCE(SUM(CASE WHEN pb.production_type='seed' THEN pb.produced_quantity ELSE COALESCE(pb.success_quantity,pb.produced_quantity) END),0) AS qty
       FROM production_batches pb JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.name_bn=$1
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$2
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$3
       GROUP BY pb.seedling_id`,
      [mother_category, monthStart, monthEndExclusive],
    );

    const prodPrev = await db.query(
      `SELECT pb.seedling_id, COALESCE(SUM(CASE WHEN pb.production_type='seed' THEN pb.produced_quantity ELSE COALESCE(pb.success_quantity,pb.produced_quantity) END),0) AS qty
       FROM production_batches pb JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.name_bn=$1
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$2
         AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$3
       GROUP BY pb.seedling_id`,
      [mother_category, fyStart, monthStart],
    );

    const distCur = await db.query(
      `SELECT st.seedling_id, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.name_bn=$1 AND st.txn_type='sale' AND st.created_at>=$2 AND st.created_at<$3
       GROUP BY st.seedling_id`,
      [mother_category, monthStart, monthEndExclusive],
    );

    const distPrev = await db.query(
      `SELECT st.seedling_id, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.name_bn=$1 AND st.txn_type='sale' AND st.created_at>=$2 AND st.created_at<$3
       GROUP BY st.seedling_id`,
      [mother_category, fyStart, monthStart],
    );

    const damageRows = await db.query(
      `SELECT d.seedling_id, COALESCE(SUM(d.quantity),0) AS qty
       FROM damages d JOIN seedlings s ON d.seedling_id=s.id JOIN categories c ON s.category_id=c.id
       WHERE c.name_bn=$1 AND d.damage_date>=$2 AND d.damage_date<$3
       GROUP BY d.seedling_id`,
      [mother_category, fyStart, monthEndExclusive],
    );

    const prevYearBal = await db.query(
      `SELECT st.seedling_id, COALESCE(SUM(st.quantity),0) AS qty
       FROM stock_transactions st
       JOIN seedlings s ON st.seedling_id=s.id
       JOIN categories c ON s.category_id=c.id
       WHERE c.name_bn=$1 AND st.txn_type='opening_balance'
       GROUP BY st.seedling_id`,
      [mother_category],
    );

    const findQty = (rows, id) => {
      const r = rows.find((x) => x.seedling_id === id);
      return r ? Number(r.qty) : 0;
    };

    const data = seedlings.rows.map((sd) => {
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
        production: {
          current_month: pCur,
          prev_months_total: pPrev,
          subtotal: pCur + pPrev,
          prev_year_balance: pJer,
          grand_total: pCur + pPrev + pJer,
        },
        distribution: {
          current_month: dCur,
          prev_months_total: dPrev,
          subtotal: dCur + dPrev,
          damaged: dmg,
          grand_total: dCur + dPrev + dmg,
        },
      };
    });

    res.json({
      success: true,
      mother_category,
      propagation_class: mc.propagation_class,
      fy: `${fy}-${String(fy + 1).slice(-2)}`,
      month,
      data,
    });
  } catch (err) {
    console.error("category-detail error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/yearly-revenue — গত ৪ অর্থবছরের রাজস্ব (rolling window)
// প্রতিটা বছরের জন্য আগে historical_revenue (manual override) check করে,
// না থাকলে sales টেবিল থেকে actual হিসাব করে
router.get("/yearly-revenue", authenticate, async (req, res) => {
  try {
    const now = new Date();
    const curFY = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const years = [curFY - 3, curFY - 2, curFY - 1, curFY]; // গত ৪ অর্থবছর (rolling)

    const results = [];
    for (const fy of years) {
      const override = await db.query(
        "SELECT amount FROM historical_revenue WHERE fiscal_year=$1",
        [fy]
      );
      let total, isManual;
      if (override.rows.length) {
        total = Number(override.rows[0].amount);
        isManual = true;
      } else {
        const fyStart = `${fy}-07-01`;
        const fyEnd = `${fy + 1}-06-30`;
        const [salesR, incomeR] = await Promise.all([
          db.query(
            `SELECT COALESCE(SUM(total_amount),0) AS total FROM sales WHERE sale_date >= $1 AND sale_date <= $2`,
            [fyStart, fyEnd]
          ),
          db.query(
            `SELECT COALESCE(SUM(amount),0) AS total FROM other_income WHERE income_date >= $1 AND income_date <= $2`,
            [fyStart, fyEnd]
          ),
        ]);
        total = Number(salesR.rows[0].total) + Number(incomeR.rows[0].total);
        isManual = false;
      }
      results.push({
        fy: `${fy}-${fy + 1}`,
        fy_year: fy,
        total,
        is_manual: isManual,
      });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error("yearly-revenue error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/historical-revenue — manual entry করা পুরনো বছরগুলোর তালিকা
router.get("/historical-revenue", authenticate, async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM historical_revenue ORDER BY fiscal_year DESC");
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reports/historical-revenue — পুরনো বছরের রাজস্ব manually entry/update
router.post("/historical-revenue", authenticate, async (req, res) => {
  const { fiscal_year, amount, notes } = req.body;
  if (!fiscal_year || amount === undefined) {
    return res.status(400).json({ success: false, message: "অর্থবছর ও রাজস্বের পরিমাণ দিন।" });
  }
  try {
    const existing = await db.query(
      "SELECT id FROM historical_revenue WHERE fiscal_year=$1",
      [fiscal_year]
    );
    if (existing.rows.length) {
      await db.query(
        "UPDATE historical_revenue SET amount=$1, notes=$2, updated_at=now() WHERE fiscal_year=$3",
        [Number(amount) || 0, notes || null, fiscal_year]
      );
    } else {
      await db.query(
        "INSERT INTO historical_revenue (fiscal_year, amount, notes, created_by) VALUES ($1,$2,$3,$4)",
        [fiscal_year, Number(amount) || 0, notes || null, req.user?.id || null]
      );
    }
    res.json({ success: true, message: "সংরক্ষণ হয়েছে ✅" });
  } catch (err) {
    console.error("save historical-revenue error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/income-report?fy=2026&month=6 — অর্থ প্রাপ্তি সংক্রান্ত প্রতিবেদন (সরকারি ফরম্যাট)
router.get("/income-report", authenticate, async (req, res) => {
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
    // চলতি মাসের ক্যাটাগরি-ভিত্তিক নগদ প্রাপ্তি (sales_items -> seedlings -> categories)
    const currentMonth = await db.query(
      `SELECT c.name_bn, COALESCE(SUM(si.total_price),0) AS total
       FROM sales_items si
       JOIN sales s ON si.sale_id = s.id
       JOIN seedlings sd ON si.seedling_id = sd.id
       LEFT JOIN categories c ON sd.category_id = c.id
       WHERE s.sale_date >= $1 AND s.sale_date < $2
       GROUP BY c.name_bn`,
      [monthStart, monthEndExclusive]
    );
    // পূর্ববর্তী মাসগুলো পর্যন্ত (অর্থবছরের শুরু থেকে চলতি মাসের আগ পর্যন্ত)
    const prevMonths = await db.query(
      `SELECT c.name_bn, COALESCE(SUM(si.total_price),0) AS total
       FROM sales_items si
       JOIN sales s ON si.sale_id = s.id
       JOIN seedlings sd ON si.seedling_id = sd.id
       LEFT JOIN categories c ON sd.category_id = c.id
       WHERE s.sale_date >= $1 AND s.sale_date < $2
       GROUP BY c.name_bn`,
      [fyStart, monthStart]
    );

    const curMap = {};
    currentMonth.rows.forEach((r) => { curMap[r.name_bn || "অন্যান্য"] = Number(r.total); });
    const prevMap = {};
    prevMonths.rows.forEach((r) => { prevMap[r.name_bn || "অন্যান্য"] = Number(r.total); });

    const allCats = [...new Set([...Object.keys(curMap), ...Object.keys(prevMap)])];
    const rows = allCats.map((cat) => {
      const curVal = curMap[cat] || 0;
      const prevVal = prevMap[cat] || 0;
      return {
        category: cat,
        current_month: curVal,
        prev_months: prevVal,
        total: curVal + prevVal,
      };
    });

    const grandCur = rows.reduce((s, r) => s + r.current_month, 0);
    const grandPrev = rows.reduce((s, r) => s + r.prev_months, 0);

    res.json({
      success: true,
      fy,
      month,
      rows,
      total_current: grandCur,
      total_prev: grandPrev,
      total: grandCur + grandPrev,
    });
  } catch (err) {
    console.error("income-report error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/bank-deposits?fy=2026 — ব্যাংকে জমা দেওয়া টাকার তালিকা
router.get("/bank-deposits", authenticate, async (req, res) => {
  const fy = parseInt(req.query.fy) || getFYDates().fy;
  try {
    const r = await db.query(
      "SELECT * FROM bank_deposits WHERE fiscal_year=$1 ORDER BY deposit_date",
      [fy]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reports/bank-deposits — নতুন ব্যাংক জমা এন্ট্রি
router.post("/bank-deposits", authenticate, async (req, res) => {
  const { fiscal_year, month_label, challan_no, deposit_date, amount, remarks } = req.body;
  if (!fiscal_year || !month_label || !deposit_date || amount === undefined) {
    return res.status(400).json({ success: false, message: "সব প্রয়োজনীয় তথ্য দিন।" });
  }
  try {
    const r = await db.query(
      `INSERT INTO bank_deposits (fiscal_year, month_label, challan_no, deposit_date, amount, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [fiscal_year, month_label, challan_no || null, deposit_date, Number(amount) || 0, remarks || null, req.user?.id || null]
    );
    res.json({ success: true, data: r.rows[0], message: "জমা এন্ট্রি সংরক্ষণ হয়েছে ✅" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/reports/bank-deposits/:id — এন্ট্রি মুছে ফেলা
router.delete("/bank-deposits/:id", authenticate, async (req, res) => {
  try {
    await db.query("DELETE FROM bank_deposits WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "মুছে ফেলা হয়েছে ✅" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
