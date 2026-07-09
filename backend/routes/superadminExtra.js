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

function toTargetType(motherCategoryNameBn) {
  return "category_" + motherCategoryNameBn.replace(/\s+/g, "_");
}

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

// PUT /category-master/:id — edit করলে সব center-এ re-sync
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

// DELETE /category-master/:id — deactivate (soft delete), seedlings data অক্ষত থাকবে
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

router.post("/center/:slug/set-category-targets", saAuth, directorOnly, async (req, res) => {
  const { slug } = req.params;
  const { fiscal_year, targets } = req.body;
  if (!fiscal_year || !Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ success: false, message: "অর্থবছর ও লক্ষ্যমাত্রার তালিকা দিন।" });
  }
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "সেন্টার পাওয়া যায়নি।" });
    const db = getPool(tenant.db_url, slug);

    let grandTotal = 0;
    for (const t of targets) {
      const targetType = toTargetType(t.mother_category_name_bn);
      const qty = Number(t.target_quantity) || 0;
      grandTotal += qty;

      const existing = await db.query(
        "SELECT id FROM targets WHERE target_type=$1 AND target_year=$2 AND target_month=0 LIMIT 1",
        [targetType, fiscal_year]
      );
      if (existing.rows.length > 0) {
        await db.query(
          "UPDATE targets SET target_quantity=$1 WHERE target_type=$2 AND target_year=$3 AND target_month=0",
          [qty, targetType, fiscal_year]
        );
      } else {
        await db.query(
          "INSERT INTO targets (target_type, target_month, target_year, target_quantity) VALUES ($1,0,$2,$3)",
          [targetType, fiscal_year, qty]
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
  const { fiscal_year } = req.query;
  if (!fiscal_year) return res.status(400).json({ success: false, message: "অর্থবছর দিন।" });
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "সেন্টার পাওয়া যায়নি।" });
    const db = getPool(tenant.db_url, slug);

    const r = await db.query(
      "SELECT target_type, target_quantity FROM targets WHERE target_type LIKE 'category_%' AND target_year=$1 AND target_month=0",
      [fiscal_year]
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

router.get("/report/topsheet", saAuth, async (req, res) => {
  const { fiscal_year, scope = "consolidated", slug } = req.query;
  try {
    const tenants = await getTenants();
    const tenantList = scope === "center" && slug ? { [slug]: tenants[slug] } : tenants;

    const agg = {};
    MOTHER_CATEGORIES.forEach((mc) => {
      agg[mc.name_bn] = { mother_category: mc.name_bn, target: 0, net_stock: 0, item_count: 0, display_order: mc.order };
    });

    for (const [tslug, tenant] of Object.entries(tenantList)) {
      if (!tenant || !tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, tslug);
        const stockRows = await db.query(
          `SELECT base_group, propagation_class, SUM(current_stock) AS net_stock, COUNT(*) AS item_count
           FROM seedling_report_view GROUP BY base_group, propagation_class`
        );
        const targetRows = await db.query(
          `SELECT target_type, target_quantity FROM targets
           WHERE target_type LIKE 'category_%' AND target_year=$1 AND target_month=0`,
          [fiscal_year]
        );
        const targetMap = {};
        targetRows.rows.forEach((r) => (targetMap[r.target_type] = r.target_quantity));

        MOTHER_CATEGORIES.forEach((mc) => {
          const stockRow = stockRows.rows.find(
            (s) => (s.base_group||'').trim() === mc.base_group && s.propagation_class === mc.propagation_class
          );
          const targetType = "category_" + mc.name_bn.replace(/\s+/g, "_");
          agg[mc.name_bn].target += targetMap[targetType] || 0;
          agg[mc.name_bn].net_stock += stockRow ? Number(stockRow.net_stock) : 0;
          agg[mc.name_bn].item_count += stockRow ? Number(stockRow.item_count) : 0;
        });
      } catch (e) {
        console.error(`[${tslug}] topsheet fetch error:`, e.message);
      }
    }

    const report = Object.values(agg).sort((a, b) => a.display_order - b.display_order);
    res.json({ success: true, scope, fiscal_year, data: report });
  } catch (err) {
    console.error("superadmin topsheet error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/report/variety-consolidated", saAuth, async (req, res) => {
  const { mother_category } = req.query;
  const mc = MOTHER_CATEGORIES.find((m) => m.name_bn === mother_category);
  if (!mc) return res.status(400).json({ success: false, message: "সঠিক mother_category দিন।" });
  try {
    const tenants = await getTenants();
    const rows = [];
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const r = await db.query(
          `SELECT common_name, variety, current_stock FROM seedling_report_view
           WHERE TRIM(base_group)=$1 AND propagation_class=$2`,
          [mc.base_group, mc.propagation_class]
        );
        r.rows.forEach((row) => rows.push({ ...row, center_slug: slug, center_name: tenant.name_bn }));
      } catch (e) {
        console.error(`[${slug}] variety fetch error:`, e.message);
      }
    }
    const grouped = {};
    rows.forEach((row) => {
      if (!grouped[row.common_name]) grouped[row.common_name] = [];
      grouped[row.common_name].push(row);
    });
    res.json({ success: true, mother_category, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
