// ============================================================
// backend/routes/budget.js — Center App-এর জন্য:
// কিস্তি-ভিত্তিক (periodic) বরাদ্দ চাহিদা দেওয়া ও দেখা
// ============================================================

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const masterDb = require("../config/masterDb");
const { authenticate } = require("../middleware/auth");

// GET /api/budget/codes — সব বাজেট কোডের তালিকা
router.get("/codes", authenticate, async (req, res) => {
  try {
    const r = await masterDb.query(
      "SELECT * FROM budget_codes ORDER BY display_order"
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/budget/periods?fy=2026 — এই অর্থবছরের খোলা কিস্তিগুলোর তালিকা
router.get("/periods", authenticate, async (req, res) => {
  const fy = parseInt(req.query.fy);
  if (!fy) return res.status(400).json({ success: false, message: "অর্থবছর দিন।" });
  try {
    const r = await masterDb.query(
      "SELECT * FROM budget_periods WHERE fiscal_year=$1 ORDER BY created_at DESC",
      [fy]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/budget/demands?fy=2026&period_id=3 — এই center-এর নির্দিষ্ট কিস্তির চাহিদা + বরাদ্দ + ঘাটতি
router.get("/demands", authenticate, async (req, res) => {
  const fy = parseInt(req.query.fy);
  const periodId = parseInt(req.query.period_id);
  if (!fy) return res.status(400).json({ success: false, message: "অর্থবছর দিন।" });
  if (!periodId) return res.status(400).json({ success: false, message: "কিস্তি বেছে নিন।" });
  try {
    const codes = await masterDb.query("SELECT * FROM budget_codes ORDER BY display_order");
    const demands = await db.query(
      "SELECT leaf_code, demanded_amount, remarks FROM budget_demands WHERE fiscal_year=$1 AND period_id=$2",
      [fy, periodId]
    );
    const demandMap = {};
    demands.rows.forEach(d => { demandMap[d.leaf_code] = { amount: Number(d.demanded_amount), remarks: d.remarks }; });

    const slug = req.tenant?.slug;
    let allocMap = {};
    if (slug) {
      const allocs = await masterDb.query(
        "SELECT leaf_code, allocated_amount FROM budget_allocations WHERE tenant_slug=$1 AND fiscal_year=$2 AND period_id=$3",
        [slug, fy, periodId]
      );
      allocs.rows.forEach(a => { allocMap[a.leaf_code] = Number(a.allocated_amount); });
    }

    const data = codes.rows.map(c => {
      const demanded = demandMap[c.leaf_code]?.amount || 0;
      const allocated = allocMap[c.leaf_code] || 0;
      return {
        ...c,
        demanded_amount: demanded,
        remarks: demandMap[c.leaf_code]?.remarks || "",
        allocated_amount: allocated,
        shortfall: Math.max(demanded - allocated, 0),
      };
    });

    res.json({ success: true, fy, period_id: periodId, data });
  } catch (err) {
    console.error("budget demands error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/budget/demands — নির্দিষ্ট কিস্তির চাহিদা সংরক্ষণ (bulk)
router.post("/demands", authenticate, async (req, res) => {
  const { fy, period_id, demands } = req.body;
  if (!fy || !period_id || !Array.isArray(demands)) {
    return res.status(400).json({ success: false, message: "অর্থবছর, কিস্তি ও চাহিদার তালিকা দিন।" });
  }
  try {
    const slug = req.tenant?.slug;
    let allocatedCodes = new Set();
    if (slug) {
      const allocs = await masterDb.query(
        "SELECT leaf_code FROM budget_allocations WHERE tenant_slug=$1 AND fiscal_year=$2 AND period_id=$3 AND allocated_amount > 0",
        [slug, fy, period_id]
      );
      allocatedCodes = new Set(allocs.rows.map((a) => a.leaf_code));
    }

    let skippedLocked = 0;
    for (const d of demands) {
      if (allocatedCodes.has(d.leaf_code)) {
        skippedLocked++;
        continue; // বরাদ্দ হয়ে গেছে এমন কোড আর পরিবর্তনযোগ্য না
      }
      const existing = await db.query(
        "SELECT id FROM budget_demands WHERE leaf_code=$1 AND fiscal_year=$2 AND period_id=$3",
        [d.leaf_code, fy, period_id]
      );
      if (existing.rows.length) {
        await db.query(
          "UPDATE budget_demands SET demanded_amount=$1, remarks=$2, updated_at=now() WHERE leaf_code=$3 AND fiscal_year=$4 AND period_id=$5",
          [Number(d.demanded_amount) || 0, d.remarks || null, d.leaf_code, fy, period_id]
        );
      } else {
        await db.query(
          "INSERT INTO budget_demands (leaf_code, fiscal_year, period_id, demanded_amount, remarks) VALUES ($1,$2,$3,$4,$5)",
          [d.leaf_code, fy, period_id, Number(d.demanded_amount) || 0, d.remarks || null]
        );
      }
    }
    const msg = skippedLocked
      ? `বরাদ্দ চাহিদা সংরক্ষণ হয়েছে ✅ (${skippedLocked}টি কোড ইতিমধ্যে বরাদ্দ পাওয়ায় পরিবর্তন করা যায়নি)`
      : "বরাদ্দ চাহিদা সংরক্ষণ হয়েছে ✅";
    res.json({ success: true, message: msg });
  } catch (err) {
    console.error("save demands error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
