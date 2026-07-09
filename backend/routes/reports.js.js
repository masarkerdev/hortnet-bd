// ============================================================
// backend/routes/reports.js — নতুন ফাইল, existing কোনো ফাইল edit করা হয় নাই।
//
// server.js-এ যোগ করার একমাত্র লাইন (existing "app.use("/api", ...)" এর কাছাকাছি,
// existing কোনো লাইন মুছে/বদলে না):
//
//     app.use("/api/reports", require("./routes/reports"));
//
// tenant middleware আগে থেকেই গ্লোবালি বসানো (server.js-এ app.use(tenantMiddleware)
// /api mount এর আগে) — তাই db.query() স্বয়ংক্রিয়ভাবে সঠিক সেন্টারের DB-তে যাবে,
// আলাদা করে কিছু বসাতে হবে না।
// ============================================================

const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { MOTHER_CATEGORIES } = require("./reports_shared");

// GET /api/reports/topsheet?fiscal_year=2025-26
router.get("/topsheet", authenticate, async (req, res) => {
  const { fiscal_year } = req.query;
  if (!fiscal_year) {
    return res.status(400).json({ success: false, message: "অর্থবছর দিন।" });
  }
  try {
    // ১. প্রতিটা mother_category-র জন্য net_stock ও item সংখ্যা
    const stockRows = await db.query(
      `SELECT base_group, propagation_class, SUM(current_stock) AS net_stock, COUNT(*) AS item_count
       FROM seedling_report_view
       GROUP BY base_group, propagation_class`
    );

    // ২. target (existing targets টেবিল থেকে, category_ prefix convention)
    const targetRows = await db.query(
      `SELECT target_type, target_quantity FROM targets
       WHERE target_type LIKE 'category_%' AND target_year = $1 AND target_month = 0`,
      [fiscal_year]
    );
    const targetMap = {};
    targetRows.rows.forEach((r) => {
      targetMap[r.target_type] = r.target_quantity;
    });

    // ৩. ১১টা mother_category ক্রম অনুযায়ী সাজিয়ে ফলাফল বানানো
    const report = MOTHER_CATEGORIES.map((mc) => {
      const stockRow = stockRows.rows.find(
        (s) => s.base_group === mc.base_group && s.propagation_class === mc.propagation_class
      );
      const targetType = "category_" + mc.name_bn.replace(/\s+/g, "_");
      return {
        mother_category: mc.name_bn,
        target: targetMap[targetType] || 0,
        net_stock: stockRow ? Number(stockRow.net_stock) : 0,
        item_count: stockRow ? Number(stockRow.item_count) : 0,
        display_order: mc.order,
        // উৎপাদন/বিতরণ চলতি-মাস, পূর্বমাস, ডিএইচালান কলামগুলো এখানে
        // production_batches ও stock_transactions থেকে date-range filter দিয়ে
        // পরের ধাপে যোগ হবে — এই route টা কাঠামোর ভিত্তি
      };
    });

    res.json({ success: true, fiscal_year, data: report });
  } catch (err) {
    console.error("topsheet report error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/category-detail?mother_category=ফলদ কলম
router.get("/category-detail", authenticate, async (req, res) => {
  const { mother_category } = req.query;
  const mc = MOTHER_CATEGORIES.find((m) => m.name_bn === mother_category);
  if (!mc) {
    return res.status(400).json({ success: false, message: "সঠিক mother_category নাম দিন।" });
  }
  try {
    const items = await db.query(
      `SELECT common_name, variety, current_stock
       FROM seedling_report_view
       WHERE base_group = $1 AND propagation_class = $2
       ORDER BY common_name, variety`,
      [mc.base_group, mc.propagation_class]
    );
    res.json({ success: true, mother_category, data: items.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
