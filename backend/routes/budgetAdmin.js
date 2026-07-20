// ============================================================
// backend/routes/budgetAdmin.js — Super Admin-এর জন্য:
// কিস্তি (period) তৈরি, consolidated view + বরাদ্দ
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

async function ensurePeriodsTable() {
  await masterDb.query(`
    CREATE TABLE IF NOT EXISTS budget_periods (
      id SERIAL PRIMARY KEY,
      fiscal_year INTEGER NOT NULL,
      name VARCHAR(200) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

// GET /api/budget-admin/periods?fy=2026 — এই অর্থবছরের সব কিস্তির তালিকা
router.get("/periods", saAuth, async (req, res) => {
  const fy = parseInt(req.query.fy);
  if (!fy) return res.status(400).json({ success: false, message: "অর্থবছর দিন।" });
  try {
    await ensurePeriodsTable();
    const r = await masterDb.query(
      "SELECT * FROM budget_periods WHERE fiscal_year=$1 ORDER BY created_at DESC",
      [fy]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/budget-admin/periods — নতুন কিস্তি তৈরি (শুধু director)
router.post("/periods", saAuth, directorOnly, async (req, res) => {
  const { fiscal_year, name } = req.body;
  if (!fiscal_year || !name || !name.trim()) {
    return res.status(400).json({ success: false, message: "অর্থবছর ও কিস্তির নাম দিন।" });
  }
  try {
    await ensurePeriodsTable();
    const r = await masterDb.query(
      "INSERT INTO budget_periods (fiscal_year, name, created_by) VALUES ($1,$2,$3) RETURNING *",
      [fiscal_year, name.trim(), req.saUser.id]
    );

    // Center App-এ notice হিসেবে জানিয়ে দিই — নতুন কিস্তির চাহিদা দেওয়ার জন্য
    try {
      await masterDb.query(
        `INSERT INTO notices (title, content, priority, created_by)
         VALUES ($1,$2,$3,$4)`,
        [
          "💰 নতুন বরাদ্দ চাহিদাপত্র কিস্তি খোলা হয়েছে",
          `"${name.trim()}" (অর্থবছর ${fiscal_year}-${fiscal_year + 1}) কিস্তির জন্য বরাদ্দ চাহিদাপত্র জমা দিন। বরাদ্দ চাহিদাপত্র পেজে গিয়ে কিস্তি নির্বাচন করে চাহিদা লিখুন।`,
          "high",
          req.saUser?.email || "director",
        ]
      );
    } catch (noticeErr) {
      console.error("period-notice error:", noticeErr.message);
    }

    res.json({ success: true, data: r.rows[0], message: "নতুন কিস্তি তৈরি হয়েছে ✅" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/budget-admin/periods/:id/toggle — কিস্তি খোলা/বন্ধ করা (শুধু director)
router.put("/periods/:id/toggle", saAuth, directorOnly, async (req, res) => {
  try {
    const r = await masterDb.query(
      "UPDATE budget_periods SET is_active = NOT is_active WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/budget-admin/consolidated?fy=2026&period_id=3 — নির্দিষ্ট কিস্তির সব center-এর চাহিদা (মাদার-কোড KPI)
router.get("/consolidated", saAuth, async (req, res) => {
  const fy = parseInt(req.query.fy);
  const periodId = parseInt(req.query.period_id);
  if (!fy) return res.status(400).json({ success: false, message: "অর্থবছর দিন।" });
  if (!periodId) return res.status(400).json({ success: false, message: "কিস্তি বেছে নিন।" });
  try {
    const codes = await masterDb.query("SELECT * FROM budget_codes ORDER BY display_order");
    const tenants = await getTenants();

    const allocRows = await masterDb.query(
      "SELECT tenant_slug, leaf_code, allocated_amount FROM budget_allocations WHERE fiscal_year=$1 AND period_id=$2",
      [fy, periodId]
    );
    const allocMap = {};
    allocRows.rows.forEach(a => { allocMap[`${a.tenant_slug}|${a.leaf_code}`] = Number(a.allocated_amount); });

    const centerRows = [];
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const demands = await db.query(
          "SELECT leaf_code, demanded_amount, remarks FROM budget_demands WHERE fiscal_year=$1 AND period_id=$2",
          [fy, periodId]
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
      period_id: periodId,
      codes: codes.rows,
      by_mother: Object.values(byMother),
      center_rows: centerRows,
    });
  } catch (err) {
    console.error("budget consolidated error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/budget-admin/allocate — নির্দিষ্ট কিস্তির বরাদ্দ নির্ধারণ (শুধু director)
router.post("/allocate", saAuth, directorOnly, async (req, res) => {
  const { tenant_slug, leaf_code, fiscal_year, period_id, allocated_amount } = req.body;
  if (!tenant_slug || !leaf_code || !fiscal_year || !period_id) {
    return res.status(400).json({ success: false, message: "সেন্টার, কোড, কিস্তি ও অর্থবছর দিন।" });
  }
  try {
    const existing = await masterDb.query(
      "SELECT id FROM budget_allocations WHERE tenant_slug=$1 AND leaf_code=$2 AND fiscal_year=$3 AND period_id=$4",
      [tenant_slug, leaf_code, fiscal_year, period_id]
    );
    if (existing.rows.length) {
      await masterDb.query(
        "UPDATE budget_allocations SET allocated_amount=$1, allocated_by=$2, updated_at=now() WHERE tenant_slug=$3 AND leaf_code=$4 AND fiscal_year=$5 AND period_id=$6",
        [Number(allocated_amount) || 0, req.saUser.id, tenant_slug, leaf_code, fiscal_year, period_id]
      );
    } else {
      await masterDb.query(
        "INSERT INTO budget_allocations (tenant_slug, leaf_code, fiscal_year, period_id, allocated_amount, allocated_by) VALUES ($1,$2,$3,$4,$5,$6)",
        [tenant_slug, leaf_code, fiscal_year, period_id, Number(allocated_amount) || 0, req.saUser.id]
      );
    }
    res.json({ success: true, message: "বরাদ্দ সংরক্ষণ হয়েছে ✅" });
  } catch (err) {
    console.error("allocate error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
