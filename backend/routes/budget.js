// ============================================================
// backend/routes/budget.js — সম্পূর্ণ নতুন ফাইল।
// existing কোনো route/table টাচ করা হয় নাই।
// Center App-এর জন্য: চাহিদা (demand) দেওয়া ও দেখা
// ============================================================

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const masterDb = require("../config/masterDb");
const { authenticate } = require("../middleware/auth");

// GET /api/budget/codes — সব বাজেট কোডের তালিকা (reference, mother-code অনুযায়ী গ্রুপ করে)
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

// GET /api/budget/demands?fy=2026 — এই center-এর চাহিদা + বরাদ্দ + ঘাটতি (একসাথে)
router.get("/demands", authenticate, async (req, res) => {
  const fy = parseInt(req.query.fy);
  if (!fy) return res.status(400).json({ success: false, message: "অর্থবছর দিন।" });
  try {
    const codes = await masterDb.query("SELECT * FROM budget_codes ORDER BY display_order");
    const demands = await db.query(
      "SELECT leaf_code, demanded_amount, remarks FROM budget_demands WHERE fiscal_year=$1",
      [fy]
    );
    const demandMap = {};
    demands.rows.forEach(d => { demandMap[d.leaf_code] = { amount: Number(d.demanded_amount), remarks: d.remarks }; });

    // এই center-এর slug বের করি tenant middleware থেকে
    const slug = req.tenant?.slug;
    let allocMap = {};
    if (slug) {
      const allocs = await masterDb.query(
        "SELECT leaf_code, allocated_amount FROM budget_allocations WHERE tenant_slug=$1 AND fiscal_year=$2",
        [slug, fy]
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

    res.json({ success: true, fy, data });
  } catch (err) {
    console.error("budget demands error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/budget/demands — চাহিদা সংরক্ষণ (bulk, একাধিক কোডের জন্য একসাথে)
router.post("/demands", authenticate, async (req, res) => {
  const { fy, demands } = req.body; // demands = [{ leaf_code, demanded_amount, remarks }]
  if (!fy || !Array.isArray(demands)) {
    return res.status(400).json({ success: false, message: "অর্থবছর ও চাহিদার তালিকা দিন।" });
  }
  try {
    for (const d of demands) {
      const existing = await db.query(
        "SELECT id FROM budget_demands WHERE leaf_code=$1 AND fiscal_year=$2",
        [d.leaf_code, fy]
      );
      if (existing.rows.length) {
        await db.query(
          "UPDATE budget_demands SET demanded_amount=$1, remarks=$2, updated_at=now() WHERE leaf_code=$3 AND fiscal_year=$4",
          [Number(d.demanded_amount) || 0, d.remarks || null, d.leaf_code, fy]
        );
      } else {
        await db.query(
          "INSERT INTO budget_demands (leaf_code, fiscal_year, demanded_amount, remarks) VALUES ($1,$2,$3,$4)",
          [d.leaf_code, fy, Number(d.demanded_amount) || 0, d.remarks || null]
        );
      }
    }
    res.json({ success: true, message: "বরাদ্দ চাহিদা সংরক্ষণ হয়েছে ✅" });
  } catch (err) {
    console.error("save demands error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
