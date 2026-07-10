// ============================================================
// backend/routes/hrm.js — সম্পূর্ণ নতুন ফাইল।
// existing কোনো route/table টাচ করা হয় নাই। শুধু প্রতিটা সেন্টারের
// "employees" টেবিল read করে consolidated ভিউ বানায়।
// ============================================================

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
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

// GET /api/hrm/consolidated — সব সেন্টারের জনবল একসাথে (designation-wise)
router.get("/consolidated", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    const rows = [];

    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const r = await db.query(
          `SELECT staff_type, worker_type, designation, posting_type, charge_type, charge_designation, status
           FROM employees WHERE status='active'`
        );
        r.rows.forEach(e => rows.push({ ...e, center_slug: slug, center_name: tenant.name_bn }));
      } catch (e) {
        console.error(`[${slug}] hrm fetch error:`, e.message);
      }
    }

    // Summary counts
    const summary = {
      total: rows.length,
      permanent: rows.filter(r => r.staff_type === 'permanent').length,
      temporary: rows.filter(r => r.staff_type === 'temporary' || r.worker_type).length,
      deputation: rows.filter(r => r.posting_type === 'deputation').length,
      charge: rows.filter(r => r.charge_type).length,
    };

    // designation + center wise group
    const byDesignation = {};
    rows.filter(r => r.staff_type === 'permanent').forEach(r => {
      const key = r.designation || 'অনির্দিষ্ট';
      if (!byDesignation[key]) byDesignation[key] = [];
      byDesignation[key].push(r);
    });

    res.json({ success: true, summary, rows, by_designation: byDesignation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
