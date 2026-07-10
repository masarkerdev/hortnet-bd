// ============================================================
// backend/routes/hrm.js — সম্পূর্ণ নতুন ফাইল।
// existing কোনো route/table টাচ করা হয় নাই। Center App-এর
// Employees.jsx-এর SANCTIONED_BY_CATEGORY হুবহু কপি করে
// প্রতিটা সেন্টারের category (A/B/C) অনুযায়ী vacancy বের করে।
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

// Center App-এর Employees.jsx থেকে হুবহু কপি — একই জায়গায় future-এ update করতে হলে দুই জায়গাতেই করতে হবে
const SANCTIONED_BY_CATEGORY = {
  A: [['উপপরিচালক',1],['উদ্যানতত্ত্ববিদ',1],['উপসহকারী উদ্যান কর্মকর্তা',4],['উচ্চমান সহকারী কাম হিসাবরক্ষক',1],['স্টোরকিপার',1],['অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',1],['ড্রাইভার',1],['ট্রাক্টর/পাওয়ার টিলার ড্রাইভার',1],['অফিস সহায়ক',1],['নিরাপত্তা প্রহরী',4],['ফার্মলেবার',16],['কুক',1]],
  B: [['উদ্যানতত্ত্ববিদ',1],['উপসহকারী উদ্যান কর্মকর্তা',3],['উচ্চমান সহকারী কাম হিসাবরক্ষক',1],['স্টোরকিপার',1],['অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',1],['ড্রাইভার',1],['অফিস সহায়ক',1],['নিরাপত্তা প্রহরী',3],['ফার্মলেবার',8],['কুক',1]],
  C: [['নার্সারি তত্ত্বাবধায়ক',1],['উপসহকারী উদ্যান কর্মকর্তা',2],['অফিস সহকারী কাম কম্পিউটার মুদ্রাক্ষরিক',1],['অফিস সহায়ক',1],['নিরাপত্তা প্রহরী',2],['ফার্মলেবার',5]],
};

// GET /api/hrm/vacancy — সব সেন্টার মিলিয়ে ফাঁকা পদের consolidated তালিকা
router.get("/vacancy", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    const centerRows = [];
    let totalSanctioned = 0, totalActual = 0, totalDeputation = 0, totalTemp = 0;

    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      const cat = tenant.category || 'B';
      const posts = SANCTIONED_BY_CATEGORY[cat] || SANCTIONED_BY_CATEGORY.B;

      try {
        const db = getPool(tenant.db_url, slug);
        const r = await db.query(
          `SELECT staff_type, worker_type, designation, posting_type, charge_type, charge_designation, name_bn
           FROM employees WHERE status='active'`
        );
        const activePerm = r.rows.filter(e => e.staff_type !== 'temporary');
        const activeTemp = r.rows.filter(e => e.staff_type === 'temporary');

        posts.forEach(([designation, sanctioned]) => {
          const actual = activePerm.filter(e => e.designation === designation).length;
          const vac = sanctioned - actual;
          totalSanctioned += sanctioned;
          totalActual += actual;
          centerRows.push({
            center_slug: slug,
            center_name: (tenant.name_bn||'').replace('হর্টিকালচার সেন্টার,','').trim() || tenant.name_bn,
            category: cat,
            designation,
            sanctioned,
            actual,
            vacant: Math.max(vac, 0),
          });
        });

        totalDeputation += activePerm.filter(e => e.posting_type === 'deputation').length;
        totalTemp += activeTemp.length;
      } catch (e) {
        console.error(`[${slug}] hrm vacancy error:`, e.message);
      }
    }

    // পদবি অনুযায়ী group — কতটা ফাঁকা মোট, কোন কোন center-এ
    const byDesignation = {};
    centerRows.forEach(r => {
      if (!byDesignation[r.designation]) {
        byDesignation[r.designation] = { designation: r.designation, total_sanctioned: 0, total_actual: 0, total_vacant: 0, centers: [] };
      }
      const d = byDesignation[r.designation];
      d.total_sanctioned += r.sanctioned;
      d.total_actual += r.actual;
      d.total_vacant += r.vacant;
      if (r.vacant > 0) {
        d.centers.push({ center_name: r.center_name, center_slug: r.center_slug, sanctioned: r.sanctioned, actual: r.actual, vacant: r.vacant });
      }
    });
    const designationSummary = Object.values(byDesignation).sort((a,b) => b.total_vacant - a.total_vacant);

    res.json({
      success: true,
      summary: {
        total_sanctioned: totalSanctioned,
        total_actual: totalActual,
        total_vacant: centerRows.reduce((s, r) => s + r.vacant, 0),
        deputation: totalDeputation,
        temporary: totalTemp,
      },
      rows: centerRows,
      by_designation: designationSummary,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
