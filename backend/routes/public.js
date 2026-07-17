// routes/public.js — কৃষক পোর্টাল (login ছাড়া)
const express = require("express");
const router = express.Router();

// সব public routes-এ no-cache header
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});
const { Pool } = require("pg");
const { getTenants } = require("../lib/tenantCache");

async function queryTenant(dbUrl, sql, params = []) {
  const { getPool } = require("../config/poolManager");
  const pool = getPool(dbUrl, dbUrl);
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (e) {
    console.error("public.js queryTenant error:", e.message);
    return [];
  }
}

// ===== সব সেন্টারের তালিকা =====
router.get("/centers", async (req, res) => {
  try {
    const tenants = await getTenants();
    const centers = Object.entries(tenants)
      .filter(([, t]) => t.active !== false)
      .map(([slug, t]) => ({
        slug,
        name_bn: t.name_bn,
        name_en: t.name_en,
        location: t.location,
        district: t.district,
        division: t.division,
        category: t.category,
        mobile: t.mobile || "",
      }));
    res.json({ success: true, data: centers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== একটি সেন্টারের সব চারা =====
router.get("/center/:slug/seedlings", async (req, res) => {
  try {
    const tenants = await getTenants();
    const tenant = tenants[req.params.slug];
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "সেন্টার পাওয়া যায়নি।" });

    const seedlings = await queryTenant(
      tenant.db_url,
      `
            SELECT s.name_bn, s.variety, s.seedling_code,
                   s.unit_price, s.current_stock,
                   c.name_bn AS category_bn
            FROM seedlings s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.is_active = true AND s.current_stock > 0
            ORDER BY c.name_bn, s.name_bn
        `,
    );

    res.json({
      success: true,
      center: {
        name_bn: tenant.name_bn,
        name_en: tenant.name_en,
        location: tenant.location,
        district: tenant.district,
      },
      data: seedlings,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== চারার নাম দিয়ে সব সেন্টারে খোঁজ =====
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ success: true, data: [] });

  try {
    const { searchCatalog } = require("../lib/catalogCache");
    const rows = await searchCatalog(q);

    // frontend আগের মতোই center-ভিত্তিক grouped format পায় (কিছু বদলাতে হয় না)
    const byCenter = {};
    rows.forEach((r) => {
      if (!byCenter[r.center_slug]) {
        byCenter[r.center_slug] = {
          slug: r.center_slug,
          name_bn: r.center_name,
          location: r.location,
          district: r.district,
          seedlings: [],
        };
      }
      byCenter[r.center_slug].seedlings.push({
        name_bn: r.seedling_name,
        variety: r.variety,
        seedling_code: r.seedling_code,
        unit_price: r.unit_price,
        current_stock: r.current_stock,
        category_bn: r.category_bn,
      });
    });

    res.json({ success: true, data: Object.values(byCenter) });
  } catch (err) {
    console.error("search error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
