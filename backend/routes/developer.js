// routes/developer.js — Developer Panel (Hidden God Mode)
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const masterPool = new Pool({
  connectionString: process.env.MASTER_DB_URL,
  ssl: false,
});
const masterDb = masterPool;

const DEV_SECRET = process.env.DEV_SECRET || "dev-secret-hortnet-2026";
const DEV_JWT_SECRET = process.env.DEV_JWT_SECRET || "dev-jwt-hortnet-2026";

// Dev auth middleware
function devAuth(req, res, next) {
  const token = req.headers["x-dev-token"];
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    req.dev = jwt.verify(token, DEV_JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// POST /api/dev/login
router.post("/login", async (req, res) => {
  const { email, password, secret_key } = req.body;
  if (!email || !password || !secret_key)
    return res.status(400).json({ success: false, message: "সব তথ্য দিন।" });

  if (secret_key !== DEV_SECRET)
    return res.status(403).json({ success: false, message: "Secret key ভুল।" });

  try {
    const r = await masterDb.query(
      "SELECT * FROM developers WHERE email=$1 AND is_active=true",
      [email]
    );
    if (!r.rows.length)
      return res.status(401).json({ success: false, message: "Account পাওয়া যায়নি।" });

    const dev = r.rows[0];
    const ok = await bcrypt.compare(password, dev.password);
    if (!ok)
      return res.status(401).json({ success: false, message: "Password ভুল।" });

    // Log access
    await masterDb.query(
      "INSERT INTO dev_logs (developer_id, action, details) VALUES ($1,$2,$3)",
      [dev.id, "login", `IP: ${req.ip}`]
    );

    const token = jwt.sign(
      { id: dev.id, email: dev.email, name: dev.name },
      DEV_JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ success: true, token, dev: { id: dev.id, name: dev.name, email: dev.email } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/stats — system overview
router.get("/stats", devAuth, async (req, res) => {
  try {
    const [tenants, admins, logs] = await Promise.all([
      masterDb.query("SELECT COUNT(*) FROM tenants"),
      masterDb.query("SELECT COUNT(*) FROM super_admins"),
      masterDb.query("SELECT * FROM dev_logs ORDER BY created_at DESC LIMIT 20"),
    ]);
    res.json({
      success: true,
      data: {
        total_centers: parseInt(tenants.rows[0].count),
        total_admins: parseInt(admins.rows[0].count),
        recent_logs: logs.rows,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/super-admins — সব super admin list
router.get("/super-admins", devAuth, async (req, res) => {
  try {
    const r = await masterDb.query(
      "SELECT id,name,email,role,district,division,is_active,created_at FROM super_admins ORDER BY created_at DESC"
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dev/reset-password — যেকোনো super admin-এর password reset
router.post("/reset-password", devAuth, async (req, res) => {
  const { email, new_password } = req.body;
  if (!email || !new_password)
    return res.status(400).json({ success: false, message: "Email ও নতুন password দিন।" });
  try {
    const hash = await bcrypt.hash(new_password, 10);
    const r = await masterDb.query(
      "UPDATE super_admins SET password=$1 WHERE email=$2 RETURNING id,name,email",
      [hash, email]
    );
    if (!r.rows.length)
      return res.status(404).json({ success: false, message: "Admin পাওয়া যায়নি।" });

    await masterDb.query(
      "INSERT INTO dev_logs (developer_id, action, details) VALUES ($1,$2,$3)",
      [req.dev.id, "reset_password", `Reset password for: ${email}`]
    );

    res.json({ success: true, message: `${r.rows[0].name}-এর password reset হয়েছে।` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dev/toggle-admin — super admin enable/disable
router.post("/toggle-admin/:id", devAuth, async (req, res) => {
  try {
    const cur = await masterDb.query("SELECT * FROM super_admins WHERE id=$1", [req.params.id]);
    if (!cur.rows.length)
      return res.status(404).json({ success: false, message: "পাওয়া যায়নি।" });

    const newStatus = !cur.rows[0].is_active;
    await masterDb.query("UPDATE super_admins SET is_active=$1 WHERE id=$2", [newStatus, req.params.id]);

    await masterDb.query(
      "INSERT INTO dev_logs (developer_id, action, details) VALUES ($1,$2,$3)",
      [req.dev.id, "toggle_admin", `${cur.rows[0].email}: ${newStatus ? 'enabled' : 'disabled'}`]
    );

    res.json({ success: true, message: `${newStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/tenants — সব center list
router.get("/tenants", devAuth, async (req, res) => {
  try {
    const r = await masterDb.query(
      "SELECT id,slug,name_bn,category,district,division,active,created_at FROM tenants ORDER BY created_at DESC"
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dev/toggle-center/:id — center enable/disable
router.post("/toggle-center/:id", devAuth, async (req, res) => {
  try {
    const cur = await masterDb.query("SELECT * FROM tenants WHERE id=$1", [req.params.id]);
    if (!cur.rows.length)
      return res.status(404).json({ success: false, message: "পাওয়া যায়নি।" });

    const newStatus = !cur.rows[0].active;
    await masterDb.query("UPDATE tenants SET active=$1 WHERE id=$2", [newStatus, req.params.id]);

    await masterDb.query(
      "INSERT INTO dev_logs (developer_id, action, details) VALUES ($1,$2,$3)",
      [req.dev.id, "toggle_center", `${cur.rows[0].slug}: ${newStatus ? 'enabled' : 'disabled'}`]
    );

    res.json({ success: true, message: `Center ${newStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET /api/dev/center-admins — সব center-এর admin info
router.get("/center-admins", devAuth, async (req, res) => {
  try {
    const { getTenants } = require("../lib/tenantCache");
    const { getPool } = require("../config/poolManager");
    const tenants = await getTenants();
    const results = [];

    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const r = await db.query(
          "SELECT id, name, email, role, is_active FROM users WHERE role='admin' LIMIT 1"
        );
        results.push({
          slug,
          name_bn: tenant.name_bn,
          category: tenant.category,
          district: tenant.district,
          mobile: tenant.mobile || "",
          active: tenant.active,
          admin: r.rows[0] || null,
        });
      } catch (e) {
        results.push({
          slug,
          name_bn: tenant.name_bn,
          category: tenant.category,
          district: tenant.district,
          mobile: tenant.mobile || "",
          active: tenant.active,
          admin: null,
          error: e.message,
        });
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/dev/center-admins/:slug — admin email/password update
router.put("/center-admins/:slug", devAuth, async (req, res) => {
  const { slug } = req.params;
  const { name, email, password } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email দিন।" });

  try {
    const { getTenants } = require("../lib/tenantCache");
    const { getPool } = require("../config/poolManager");
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "Center পাওয়া যায়নি।" });

    const db = getPool(tenant.db_url, slug);

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        "UPDATE users SET name=$1, email=$2, password=$3 WHERE role='admin'",
        [name, email, hash]
      );
    } else {
      await db.query(
        "UPDATE users SET name=$1, email=$2 WHERE role='admin'",
        [name, email]
      );
    }

    // dev log
    await masterDb.query(
      "INSERT INTO dev_logs (developer_id, action, details) VALUES ($1,$2,$3)",
      [req.dev.id, "update_center_admin", `Updated admin for: ${slug}`]
    );

    res.json({ success: true, message: `${tenant.name_bn}-এর admin আপডেট হয়েছে।` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/integrity-check — সব center-এ trailing space, missing table/column check
router.get("/integrity-check", devAuth, async (req, res) => {
  const { getTenants } = require("../lib/tenantCache");
  const { getPool } = require("../config/poolManager");
  const { Pool } = require("pg");

  // প্রয়োজনীয় টেবিল ও কলাম যেগুলো প্রতিটা center DB-তে থাকা বাধ্যতামূলক
  const REQUIRED_TABLES = [
    "employees", "produce_prices", "room_categories",
    "budget_demands", "mother_plants",
  ];
  const REQUIRED_COLUMNS = [
    { table: "categories", column: "category_master_id" },
    { table: "categories", column: "base_group" },
    { table: "other_income", column: "quantity" },
    { table: "mother_plants", column: "quantity" },
  ];

  const issues = [];

  try {
    // ১) master DB-তে tenants টেবিলে trailing space check (slug, name_bn, name_en, db_url)
    const masterDb = require("../config/masterDb");
    const tenantsResult = await masterDb.query(
      "SELECT id, slug, name_bn, name_en, db_url FROM tenants"
    );
    tenantsResult.rows.forEach((t) => {
      ["slug", "name_bn", "name_en", "db_url"].forEach((field) => {
        const val = t[field];
        if (val && val !== val.trim()) {
          issues.push({
            type: "trailing_space",
            severity: "high",
            slug: t.slug,
            detail: `tenants.${field} — এ trailing/leading space আছে: "${val}"`,
          });
        }
      });
    });

    // ২) প্রতিটা center-এর DB-তে গিয়ে টেবিল/কলাম check
    const tenants = await getTenants();
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.db_url) {
        issues.push({ type: "missing_db_url", severity: "critical", slug, detail: "db_url ফাঁকা" });
        continue;
      }
      let pool;
      try {
        pool = getPool(tenant.db_url, tenant.db_url);
        await pool.query("SELECT 1");
      } catch (e) {
        issues.push({
          type: "connection_failed",
          severity: "critical",
          slug,
          detail: `Database সংযোগ ব্যর্থ: ${e.message}`,
        });
        continue;
      }

      for (const tbl of REQUIRED_TABLES) {
        try {
          const r = await pool.query("SELECT to_regclass($1) AS t", [tbl]);
          if (!r.rows[0].t) {
            issues.push({
              type: "missing_table",
              severity: "high",
              slug,
              detail: `টেবিল "${tbl}" নেই`,
            });
          }
        } catch (e) {
          issues.push({ type: "check_error", severity: "medium", slug, detail: e.message });
        }
      }

      for (const { table, column } of REQUIRED_COLUMNS) {
        try {
          const r = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2",
            [table, column]
          );
          if (!r.rows.length) {
            issues.push({
              type: "missing_column",
              severity: "high",
              slug,
              detail: `"${table}.${column}" কলাম নেই`,
            });
          }
        } catch (e) {
          issues.push({ type: "check_error", severity: "medium", slug, detail: e.message });
        }
      }
    }

    res.json({
      success: true,
      total_issues: issues.length,
      checked_centers: Object.keys(tenants).length,
      issues,
    });
  } catch (err) {
    console.error("integrity-check error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
