// ============================================================
// backend/routes/superadminExtra.js — সম্পূর্ণ নতুন ফাইল।
// existing backend/routes/superadmin.js এর একটা অক্ষর ও বদলানো হয় নাই।
// ============================================================

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const masterDb = require("../config/masterDb");
const { getTenants } = require("../lib/tenantCache");
const { getPool } = require("../config/poolManager");
const { MOTHER_CATEGORIES } = require("./reports_shared");

const SA_SECRET = process.env.SA_JWT_SECRET || "sa-secret-change-this";

function saAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, message: "Login করুন।" });
  try {
    req.saUser = jwt.verify(token, SA_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session শেষ।" });
  }
}

function directorOnly(req, res, next) {
  if (req.saUser.role !== "director")
    return res.status(403).json({ success: false, message: "শুধু পরিচালক করতে পারবেন।" });
  next();
}

// ── Category Master ──

router.get("/category-master", saAuth, async (req, res) => {
  try {
    const r = await masterDb.query(
      "SELECT * FROM category_master WHERE is_active = true ORDER BY base_group, name_bn"
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/mother-categories", saAuth, async (req, res) => {
  res.json({ success: true, data: MOTHER_CATEGORIES });
});

router.post("/category-master", saAuth, directorOnly, async (req, res) => {
  const { name_bn, name_en, base_group } = req.body;
  if (!name_bn || !base_group) {
    return res.status(400).json({ success: false, message: "ক্যাটাগরির নাম ও গ্রুপ দিন।" });
  }
  try {
    const existing = await masterDb.query("SELECT id FROM category_master WHERE name_bn = $1", [name_bn]);
    let categoryId;
    if (existing.rows.length > 0) {
      categoryId = existing.rows[0].id;
      await masterDb.query(
        "UPDATE category_master SET name_en=$1, base_group=$2, updated_at=now() WHERE id=$3",
        [name_en || null, base_group, categoryId]
      );
    } else {
      const inserted = await masterDb.query(
        "INSERT INTO category_master (name_bn, name_en, base_group, created_by) VALUES ($1,$2,$3,$4) RETURNING id",
        [name_bn, name_en || null, base_group, req.saUser.id]
      );
      categoryId = inserted.rows[0].id;
    }

    const tenants = await getTenants();
    let syncedCount = 0;
    const failedSlugs = [];

    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const localExisting = await db.query("SELECT id FROM categories WHERE name_bn = $1", [name_bn]);
        if (localExisting.rows.length > 0) {
          await db.query("UPDATE categories SET category_master_id=$1, base_group=$2 WHERE id=$3", [
            categoryId, base_group, localExisting.rows[0].id,
          ]);
        } else {
          await db.query(
            "INSERT INTO categories (name_bn, name_en, category_master_id, base_group) VALUES ($1,$2,$3,$4)",
            [name_bn, name_en || null, categoryId, base_group]
          );
        }
        syncedCount++;
      } catch (e) {
        failedSlugs.push(slug);
      }
    }

    await masterDb.query(
      "INSERT INTO category_sync_log (category_master_id, action, synced_centers, failed_centers) VALUES ($1,$2,$3,$4)",
      [categoryId, existing.rows.length > 0 ? "update" : "create", syncedCount, failedSlugs.join(",") || null]
    );

    res.json({
      success: true,
      message: `"${name_bn}" ${syncedCount}টি সেন্টারে সিঙ্ক হয়েছে।${failedSlugs.length ? ` (${failedSlugs.length}টি ব্যর্থ)` : ""}`,
      data: { id: categoryId, failed_centers: failedSlugs },
    });
  } catch (err) {
    console.error("category-master sync error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/category-master/:id", saAuth, directorOnly, async (req, res) => {
  const { id } = req.params;
  const { name_bn, name_en, base_group } = req.body;
  if (!name_bn || !base_group) {
    return res.status(400).json({ success: false, message: "নাম ও গ্রুপ দিন।" });
  }
  try {
    const old = await masterDb.query("SELECT name_bn FROM category_master WHERE id=$1", [id]);
    if (!old.rows.length) return res.status(404).json({ success: false, message: "পাওয়া যায়নি।" });

    await masterDb.query(
      "UPDATE category_master SET name_bn=$1, name_en=$2, base_group=$3, updated_at=now() WHERE id=$4",
      [name_bn, name_en || null, base_group, id]
    );

    const tenants = await getTenants();
    let syncedCount = 0;
    const failedSlugs = [];

    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        await db.query(
          "UPDATE categories SET name_bn=$1, name_en=$2, base_group=$3 WHERE category_master_id=$4",
          [name_bn, name_en || null, base_group, id]
        );
        syncedCount++;
      } catch (e) {
        failedSlugs.push(slug);
      }
    }

    await masterDb.query(
      "INSERT INTO category_sync_log (category_master_id, action, synced_centers, failed_centers) VALUES ($1,$2,$3,$4)",
      [id, "update", syncedCount, failedSlugs.join(",") || null]
    );

    res.json({ success: true, message: `"${name_bn}" আপডেট ও ${syncedCount}টি সেন্টারে সিঙ্ক হয়েছে।` });
  } catch (err) {
    console.error("category-master update error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/category-master/:id", saAuth, directorOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const cat = await masterDb.query("SELECT name_bn FROM category_master WHERE id=$1", [id]);
    if (!cat.rows.length) return res.status(404).json({ success: false, message: "পাওয়া যায়নি।" });

    await masterDb.query("UPDATE category_master SET is_active=false, updated_at=now() WHERE id=$1", [id]);

    res.json({ success: true, message: `"${cat.rows[0].name_bn}" নিষ্ক্রিয় করা হয়েছে। সেন্টারের existing চারার তথ্য অক্ষত আছে।` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Category Requests ──

router.get("/category-requests", saAuth, async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const r = await masterDb.query(
      "SELECT * FROM category_requests WHERE status = $1 ORDER BY created_at DESC",
      [status]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/category-requests/:id/reject", saAuth, directorOnly, async (req, res) => {
  try {
    await masterDb.query(
      "UPDATE category_requests SET status='rejected', reviewed_by=$1, reviewed_at=now() WHERE id=$2",
      [req.saUser.id, req.params.id]
    );
    res.json({ success: true, message: "অনুরোধ প্রত্যাখ্যান করা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── ক্যাটাগরি-ওয়াইজ টার্গেট (fy = INTEGER, existing targets টেবিল convention) ──

router.post("/center/:slug/set-category-targets", saAuth, directorOnly, async (req, res) => {
  const { slug } = req.params;
  const { fy, targets } = req.body;
  if (!fy || !Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ success: false, message: "অর্থবছর ও লক্ষ্যমাত্রার তালিকা দিন।" });
  }
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "সেন্টার পাওয়া যায়নি।" });
    const db = getPool(tenant.db_url, slug);

    let grandTotal = 0;
    for (const t of targets) {
      const targetType = "category_" + t.mother_category_name_bn.replace(/\s+/g, "_");
      const qty = Number(t.target_quantity) || 0;
      grandTotal += qty;

      const existing = await db.query(
        "SELECT id FROM targets WHERE target_type=$1 AND target_year=$2 AND target_month=0 LIMIT 1",
        [targetType, fy]
      );
      if (existing.rows.length > 0) {
        await db.query(
          "UPDATE targets SET target_quantity=$1 WHERE target_type=$2 AND target_year=$3 AND target_month=0",
          [qty, targetType, fy]
        );
      } else {
        await db.query(
          "INSERT INTO targets (target_type, target_month, target_year, target_quantity) VALUES ($1,0,$2,$3)",
          [targetType, fy, qty]
        );
      }
    }

    res.json({
      success: true,
      message: `${tenant.name_bn || slug}-এর ক্যাটাগরি-ওয়াইজ লক্ষ্যমাত্রা সংরক্ষণ হয়েছে ✅`,
      data: { grand_total: grandTotal },
    });
  } catch (err) {
    console.error("set-category-targets error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/center/:slug/category-targets", saAuth, async (req, res) => {
  const { slug } = req.params;
  const fy = parseInt(req.query.fy);
  if (!fy) return res.status(400).json({ success: false, message: "অর্থবছর দিন (fy)।" });
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "সেন্টার পাওয়া যায়নি।" });
    const db = getPool(tenant.db_url, slug);

    const r = await db.query(
      "SELECT target_type, target_quantity FROM targets WHERE target_type LIKE 'category_%' AND target_year=$1 AND target_month=0",
      [fy]
    );
    const targetsMap = {};
    let grandTotal = 0;
    r.rows.forEach((row) => {
      const motherCatName = row.target_type.replace("category_", "").replace(/_/g, " ");
      targetsMap[motherCatName] = row.target_quantity;
      grandTotal += row.target_quantity;
    });

    res.json({ success: true, data: { targets: targetsMap, grand_total: grandTotal } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Super Admin Topsheet (consolidated / center-wise) — fy = INTEGER ──

router.get("/report/topsheet", saAuth, async (req, res) => {
  const fy = parseInt(req.query.fy);
  const month = parseInt(req.query.month);
  const scope = req.query.scope || "consolidated";
  const slug = req.query.slug;

  if (!fy) return res.status(400).json({ success: false, message: "অর্থবছর (fy) দিন।" });

  const now = new Date();
  const curMonth = month || now.getMonth() + 1;
  const calYear = curMonth >= 7 ? fy : fy + 1;
  const pad2 = (n) => String(n).padStart(2, "0");
  const fyStart = `${fy}-07-01`;
  const monthStart = `${calYear}-${pad2(curMonth)}-01`;
  const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
  const nextCalYear = curMonth === 12 ? calYear + 1 : calYear;
  const monthEndExclusive = `${nextCalYear}-${pad2(nextMonth)}-01`;

  try {
    const tenants = await getTenants();
    const tenantList = scope === "center" && slug ? { [slug]: tenants[slug] } : tenants;

    const agg = {};
    MOTHER_CATEGORIES.forEach((mc) => {
      agg[mc.name_bn] = {
        display_order: mc.order,
        mother_category: mc.name_bn,
        divisional_target: 0,
        production: { current_month: 0, prev_months_total: 0, subtotal: 0, dae_challan_received: 0, prev_year_balance: 0, grand_total: 0 },
        distribution: { target: 0, current_month: 0, prev_months_total: 0, subtotal: 0, dae_challan_sent: 0, damaged: 0, grand_total: 0 },
        net_stock: 0,
      };
    });

    for (const [tslug, tenant] of Object.entries(tenantList)) {
      if (!tenant || !tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, tslug);

        const targetRows = await db.query(
          `SELECT target_type, target_quantity FROM targets WHERE target_type LIKE 'category_%' AND target_year=$1 AND target_month=0`,
          [fy]
        );
        const targetMap = {};
        targetRows.rows.forEach((r) => (targetMap[r.target_type] = Number(r.target_quantity)));

        const prodCurrent = await db.query(
          `SELECT c.name_bn, COALESCE(SUM(pb.produced_quantity),0) AS qty FROM production_batches pb
           JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$1 AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$2
           GROUP BY c.name_bn`, [monthStart, monthEndExclusive]);

        const prodPrevMonths = await db.query(
          `SELECT c.name_bn, COALESCE(SUM(pb.produced_quantity),0) AS qty FROM production_batches pb
           JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$1 AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$2
           GROUP BY c.name_bn`, [fyStart, monthStart]);

        const distCurrent = await db.query(
          `SELECT c.name_bn, COALESCE(SUM(st.quantity),0) AS qty FROM stock_transactions st
           JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE st.txn_type='sale' AND st.created_at>=$1 AND st.created_at<$2
           GROUP BY c.name_bn`, [monthStart, monthEndExclusive]);

        const distPrevMonths = await db.query(
          `SELECT c.name_bn, COALESCE(SUM(st.quantity),0) AS qty FROM stock_transactions st
           JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE st.txn_type='sale' AND st.created_at>=$1 AND st.created_at<$2
           GROUP BY c.name_bn`, [fyStart, monthStart]);

        const damageRows = await db.query(
          `SELECT c.name_bn, COALESCE(SUM(d.quantity),0) AS qty FROM damages d
           JOIN seedlings s ON d.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE d.damage_date>=$1 AND d.damage_date<$2
           GROUP BY c.name_bn`, [fyStart, monthEndExclusive]);

        const prevYearBalance = await db.query(
          `SELECT c.name_bn, COALESCE(SUM(latest.balance_after),0) AS qty
           FROM seedlings s JOIN categories c ON s.category_id=c.id
           LEFT JOIN LATERAL (SELECT balance_after FROM stock_transactions st WHERE st.seedling_id=s.id AND st.created_at<$1 ORDER BY st.created_at DESC LIMIT 1) latest ON true
           GROUP BY c.name_bn`, [fyStart]);

        const netStock = await db.query(
          `SELECT c.name_bn, COALESCE(SUM(s.current_stock),0) AS qty
           FROM seedlings s JOIN categories c ON s.category_id=c.id WHERE s.is_active=true
           GROUP BY c.name_bn`);

        const findQty = (rows, catName) => {
          const row = rows.find((r) => r.name_bn === catName);
          return row ? Number(row.qty) : 0;
        };

        MOTHER_CATEGORIES.forEach((mc) => {
          const targetType = "category_" + mc.name_bn.replace(/\s+/g, "_");
          const target = targetMap[targetType] || 0;
          const a = agg[mc.name_bn];

          a.divisional_target += target;

          const prodCur = findQty(prodCurrent.rows, mc.name_bn);
          const prodPrev = findQty(prodPrevMonths.rows, mc.name_bn);
          const prevYearJer = findQty(prevYearBalance.rows, mc.name_bn);
          a.production.current_month += prodCur;
          a.production.prev_months_total += prodPrev;
          a.production.subtotal += prodCur + prodPrev;
          a.production.prev_year_balance += prevYearJer;
          a.production.grand_total += prodCur + prodPrev + prevYearJer;

          const distCur = findQty(distCurrent.rows, mc.name_bn);
          const distPrev = findQty(distPrevMonths.rows, mc.name_bn);
          const damaged = findQty(damageRows.rows, mc.name_bn);
          a.distribution.target += target;
          a.distribution.current_month += distCur;
          a.distribution.prev_months_total += distPrev;
          a.distribution.subtotal += distCur + distPrev;
          a.distribution.damaged += damaged;
          a.distribution.grand_total += distCur + distPrev + damaged;

          a.net_stock += findQty(netStock.rows, mc.name_bn);
        });
      } catch (e) {
        console.error(`[${tslug}] topsheet fetch error:`, e.message);
      }
    }

    const report = Object.values(agg).sort((a, b) => a.display_order - b.display_order);
    res.json({ success: true, scope, fy: `${fy}-${String(fy + 1).slice(-2)}`, month: curMonth, data: report });
  } catch (err) {
    console.error("superadmin topsheet error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET /api/superadmin/report/target-summary?fy=2026 — সব সেন্টার মিলিয়ে consolidated target vs achieved
router.get("/report/target-summary", saAuth, async (req, res) => {
  const fy = parseInt(req.query.fy) || (new Date().getMonth()>=6 ? new Date().getFullYear() : new Date().getFullYear()-1);
  const fyStart = `${fy}-07-01`;
  const fyEnd = `${fy+1}-06-30`;
  try {
    const tenants = await getTenants();
    let totalTarget = 0, totalAchieved = 0;

    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const targetRows = await db.query(
          `SELECT COALESCE(SUM(target_quantity),0) AS total FROM targets
           WHERE target_type LIKE 'category_%' AND target_year=$1 AND target_month=0`,
          [fy]
        );
        const achievedRows = await db.query(
          `SELECT COALESCE(SUM(produced_quantity),0) AS total FROM production_batches
           WHERE COALESCE(propagation_date, sowing_date, created_at::date) >= $1
             AND COALESCE(propagation_date, sowing_date, created_at::date) <= $2`,
          [fyStart, fyEnd]
        );
        totalTarget += Number(targetRows.rows[0].total);
        totalAchieved += Number(achievedRows.rows[0].total);
      } catch (e) {
        console.error(`[${slug}] target-summary error:`, e.message);
      }
    }

    const percent = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 1000) / 10 : 0;
    res.json({ success: true, fy: `${fy}-${String(fy+1).slice(-2)}`, target: totalTarget, achieved: totalAchieved, percent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/report/category-detail", saAuth, async (req, res) => {
  const { mother_category, fy: fyParam, month: monthParam, scope = "consolidated", slug: onlySlug } = req.query;
  const mc = MOTHER_CATEGORIES.find((m) => m.name_bn === mother_category);
  if (!mc) return res.status(400).json({ success: false, message: "সঠিক mother_category দিন।" });

  const fy = parseInt(fyParam) || (new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1);
  const fyStart = `${fy}-07-01`;
  const now = new Date();
  const month = parseInt(monthParam) || now.getMonth() + 1;
  const calYear = month >= 7 ? fy : fy + 1;
  const pad2 = (n) => String(n).padStart(2, "0");
  const monthStart = `${calYear}-${pad2(month)}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextCalYear = month === 12 ? calYear + 1 : calYear;
  const monthEndExclusive = `${nextCalYear}-${pad2(nextMonth)}-01`;

  try {
    const tenants = await getTenants();
    const tenantList = scope === "center" && onlySlug ? { [onlySlug]: tenants[onlySlug] } : tenants;
    const merged = {}; // key: common_name + '|' + variety

    for (const [slug, tenant] of Object.entries(tenantList)) {
      if (!tenant || !tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);

        const seedlings = await db.query(
          `SELECT s.id AS seedling_id, c.name_bn AS common_name, s.variety, s.current_stock
           FROM seedlings s JOIN categories c ON s.category_id = c.id
           WHERE c.name_bn = $1 AND s.is_active = true`,
          [mother_category]
        );
        if (!seedlings.rows.length) continue;

        const prodCur = await db.query(
          `SELECT pb.seedling_id, COALESCE(SUM(pb.produced_quantity),0) AS qty
           FROM production_batches pb JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE c.name_bn=$1
             AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$2
             AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$3
           GROUP BY pb.seedling_id`, [mother_category, monthStart, monthEndExclusive]);

        const prodPrev = await db.query(
          `SELECT pb.seedling_id, COALESCE(SUM(pb.produced_quantity),0) AS qty
           FROM production_batches pb JOIN seedlings s ON pb.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE c.name_bn=$1
             AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)>=$2
             AND COALESCE(pb.propagation_date, pb.sowing_date, pb.created_at::date)<$3
           GROUP BY pb.seedling_id`, [mother_category, fyStart, monthStart]);

        const distCur = await db.query(
          `SELECT st.seedling_id, COALESCE(SUM(st.quantity),0) AS qty
           FROM stock_transactions st JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE c.name_bn=$1 AND st.txn_type='sale' AND st.created_at>=$2 AND st.created_at<$3
           GROUP BY st.seedling_id`, [mother_category, monthStart, monthEndExclusive]);

        const distPrev = await db.query(
          `SELECT st.seedling_id, COALESCE(SUM(st.quantity),0) AS qty
           FROM stock_transactions st JOIN seedlings s ON st.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE c.name_bn=$1 AND st.txn_type='sale' AND st.created_at>=$2 AND st.created_at<$3
           GROUP BY st.seedling_id`, [mother_category, fyStart, monthStart]);

        const damageRows = await db.query(
          `SELECT d.seedling_id, COALESCE(SUM(d.quantity),0) AS qty
           FROM damages d JOIN seedlings s ON d.seedling_id=s.id JOIN categories c ON s.category_id=c.id
           WHERE c.name_bn=$1 AND d.damage_date>=$2 AND d.damage_date<$3
           GROUP BY d.seedling_id`, [mother_category, fyStart, monthEndExclusive]);

        const prevYearBal = await db.query(
          `SELECT s.id AS seedling_id, COALESCE(latest.balance_after,0) AS qty
           FROM seedlings s JOIN categories c ON s.category_id=c.id
           LEFT JOIN LATERAL (
             SELECT balance_after FROM stock_transactions st WHERE st.seedling_id=s.id AND st.created_at<$2
             ORDER BY st.created_at DESC LIMIT 1
           ) latest ON true
           WHERE c.name_bn=$1`, [mother_category, fyStart]);

        const findQty = (rows, id) => { const r = rows.find(x=>x.seedling_id===id); return r ? Number(r.qty) : 0; };

        seedlings.rows.forEach(sd => {
          const key = sd.common_name + "|" + (sd.variety || "");
          if (!merged[key]) {
            merged[key] = {
              common_name: sd.common_name, variety: sd.variety, current_stock: 0,
              production: { current_month:0, prev_months_total:0, subtotal:0, prev_year_balance:0, grand_total:0 },
              distribution: { current_month:0, prev_months_total:0, subtotal:0, damaged:0, grand_total:0 },
            };
          }
          const m = merged[key];
          const pCur = findQty(prodCur.rows, sd.seedling_id);
          const pPrev = findQty(prodPrev.rows, sd.seedling_id);
          const pJer = findQty(prevYearBal.rows, sd.seedling_id);
          const dCur = findQty(distCur.rows, sd.seedling_id);
          const dPrev = findQty(distPrev.rows, sd.seedling_id);
          const dmg = findQty(damageRows.rows, sd.seedling_id);

          m.current_stock += Number(sd.current_stock) || 0;
          m.production.current_month += pCur;
          m.production.prev_months_total += pPrev;
          m.production.subtotal += pCur+pPrev;
          m.production.prev_year_balance += pJer;
          m.production.grand_total += pCur+pPrev+pJer;
          m.distribution.current_month += dCur;
          m.distribution.prev_months_total += dPrev;
          m.distribution.subtotal += dCur+dPrev;
          m.distribution.damaged += dmg;
          m.distribution.grand_total += dCur+dPrev+dmg;
        });
      } catch (e) {
        console.error(`[${slug}] category-detail fetch error:`, e.message);
      }
    }

    const data = Object.values(merged).sort((a,b) => a.common_name.localeCompare(b.common_name,'bn') || (a.variety||'').localeCompare(b.variety||'','bn'));
    res.json({ success: true, mother_category, propagation_class: mc.propagation_class, scope, fy: `${fy}-${String(fy+1).slice(-2)}`, month, data });
  } catch (err) {
    console.error("superadmin category-detail error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
