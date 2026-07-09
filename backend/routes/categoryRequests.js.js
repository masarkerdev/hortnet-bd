// ============================================================
// backend/routes/categoryRequests.js — নতুন ফাইল, existing কোনো ফাইল edit হয় নাই।
//
// server.js-এ যোগ করার একমাত্র লাইন:
//
//     app.use("/api/category-requests", require("./routes/categoryRequests"));
//
// tenant middleware আগে থেকেই গ্লোবালি বসানো, req.tenant.slug (middleware/tenant.js
// দেখুন) থেকে সেন্টার চেনা যাবে। db.query() = center-এর নিজস্ব DB,
// masterDb.query() = master DB।
// ============================================================

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const masterDb = require("../config/masterDb");
const { authenticate } = require("../middleware/auth");

// POST /api/category-requests
// body: { requested_name_bn, suggested_base_group, reason }
router.post("/", authenticate, async (req, res) => {
  const { requested_name_bn, suggested_base_group, reason } = req.body;
  if (!requested_name_bn) {
    return res.status(400).json({ success: false, message: "ক্যাটাগরির নাম দিন।" });
  }
  try {
    await masterDb.query(
      `INSERT INTO category_requests
         (tenant_slug, requested_name_bn, suggested_base_group, reason)
       VALUES ($1, $2, $3, $4)`,
      [req.tenant.slug, requested_name_bn, suggested_base_group || null, reason || null]
    );
    res.json({ success: true, message: "অনুরোধ সুপার এডমিনের কাছে পাঠানো হয়েছে।" });
  } catch (err) {
    console.error("category request error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/category-requests/available
// সেন্টার অ্যাপের dropdown-এ দেখানোর জন্য — শুধু category_master_id সেট থাকা category গুলো
// (এটা existing categories টেবিলের উপর একটা read-only SELECT, কোনো ডাটা বদলায় না)
router.get("/available", authenticate, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, name_bn, name_en, base_group
       FROM categories
       WHERE category_master_id IS NOT NULL
       ORDER BY base_group, name_bn`
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
