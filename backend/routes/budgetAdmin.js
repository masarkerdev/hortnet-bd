// ============================================================
// backend/routes/budgetAdmin.js — সম্পূর্ণ নতুন ফাইল।
// existing superadmin.js / superadminExtra.js এর একটা অক্ষরও
// টাচ করা হয় নাই। Super Admin-এর জন্য: consolidated view + বরাদ্দ।
// ============================================================

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const masterDb = require("../config/masterDb");
const { getTenants } = require("../lib/tenantCache");
const { getPool } = require("../config/poolManager");

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

// GET /api/budget-admin/consolidated?fy=2026 — সব center-এর চাহিদা একসাথে (মাদার-কোড অনুযায়ী KPI)
router.get("/consolidated", saAuth, async (req, res) => {
  const fy = parseInt(req.query.fy);
  if (!fy) return res.status(400).json({ success: false, message: "অর্থবছর দিন।" });
  try {
    const codes = await masterDb.query("SELECT * FROM budget_codes ORDER BY display_order");
    const tenants = await getTenants();

    // সব center-এর allocation একবারে নিয়ে নিই
    const allocRows = await masterDb.query(
      "SELECT tenant_slug, leaf_code, allocated_amount FROM budget_allocations WHERE fiscal_year=$1",
      [fy]
    );
    const allocMap = {}; // slug|leaf_code -> amount
    allocRows.rows.forEach(a => { allocMap[`${a.tenant_slug}|${a.leaf_code}`] = Number(a.allocated_amount); });

    const centerRows = []; // প্রতিটা center + leaf_code combination
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const demands = await db.query(
          "SELECT leaf_code, demanded_amount, remarks FROM budget_demands WHERE fiscal_year=$1",
          [fy]
        );
        demands.rows.forEach(d => {
          centerRows.push({
            center_slug: slug,
            center_name: (tenant.name_bn || "").replace("হর্টিকালচার সেন্টার,", "").trim() || tenant.name_bn,
            leaf_code: d.leaf_code,
            demanded_amount: Number(d.demanded_amount),
            remarks: d.remarks,
            allocated_amount: allocMap[`${slug}|${d.leaf_code}`] || 0,
          });
        });
      } catch (e) {
        console.error(`[${slug}] budget fetch error:`, e.message);
      }
    }

    // মাদার কোড অনুযায়ী KPI (সব center মিলিয়ে যোগফল)
    const byMother = {};
    codes.rows.forEach(c => {
      if (!byMother[c.mother_code]) {
        byMother[c.mother_code] = { mother_code: c.mother_code, mother_name: c.mother_name, total_demand: 0, total_allocated: 0 };
      }
    });
    centerRows.forEach(r => {
      const code = codes.rows.find(c => c.leaf_code === r.leaf_code);
      if (!code) return;
      byMother[code.mother_code].total_demand += r.demanded_amount;
      byMother[code.mother_code].total_allocated += r.allocated_amount;
    });

    res.json({
      success: true,
      fy,
      codes: codes.rows,
      by_mother: Object.values(byMother),
      center_rows: centerRows,
    });
  } catch (err) {
    console.error("budget consolidated error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/budget-admin/allocate — একটা center-এর একটা leaf_code-এ বরাদ্দ নির্ধারণ (শুধু director)
router.post("/allocate", saAuth, directorOnly, async (req, res) => {
  const { tenant_slug, leaf_code, fiscal_year, allocated_amount } = req.body;
  if (!tenant_slug || !leaf_code || !fiscal_year) {
    return res.status(400).json({ success: false, message: "সেন্টার, কোড ও অর্থবছর দিন।" });
  }
  try {
    const existing = await masterDb.query(
      "SELECT id FROM budget_allocations WHERE tenant_slug=$1 AND leaf_code=$2 AND fiscal_year=$3",
      [tenant_slug, leaf_code, fiscal_year]
    );
    if (existing.rows.length) {
      await masterDb.query(
        "UPDATE budget_allocations SET allocated_amount=$1, allocated_by=$2, updated_at=now() WHERE tenant_slug=$3 AND leaf_code=$4 AND fiscal_year=$5",
        [Number(allocated_amount) || 0, req.saUser.id, tenant_slug, leaf_code, fiscal_year]
      );
    } else {
      await masterDb.query(
        "INSERT INTO budget_allocations (tenant_slug, leaf_code, fiscal_year, allocated_amount, allocated_by) VALUES ($1,$2,$3,$4,$5)",
        [tenant_slug, leaf_code, fiscal_year, Number(allocated_amount) || 0, req.saUser.id]
      );
    }
    res.json({ success: true, message: "বরাদ্দ সংরক্ষণ হয়েছে ✅" });
  } catch (err) {
    console.error("allocate error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
