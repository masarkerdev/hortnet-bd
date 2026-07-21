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

// POST /api/dev/change-slug — center-এর slug পরিবর্তন (শুধু Dev Panel-এ, খুবই সতর্কতার সাথে)
router.post("/change-slug", devAuth, async (req, res) => {
  const { oldSlug, newSlug } = req.body;
  if (!oldSlug || !newSlug) {
    return res.status(400).json({ success: false, message: "পুরনো ও নতুন slug দিন।" });
  }
  const cleanNewSlug = newSlug.trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(cleanNewSlug)) {
    return res.status(400).json({
      success: false,
      message: "Slug-এ শুধু ছোট হাতের ইংরেজি অক্ষর, সংখ্যা, - এবং _ ব্যবহার করা যাবে।",
    });
  }
  try {
    const existing = await masterDb.query("SELECT id FROM tenants WHERE slug=$1", [cleanNewSlug]);
    if (existing.rows.length) {
      return res.status(400).json({ success: false, message: "এই slug ইতিমধ্যে অন্য center ব্যবহার করছে।" });
    }
    const r = await masterDb.query(
      "UPDATE tenants SET slug=$1 WHERE slug=$2 RETURNING id, name_bn",
      [cleanNewSlug, oldSlug.trim().toLowerCase()]
    );
    if (!r.rows.length) {
      return res.status(404).json({ success: false, message: "পুরনো slug-এর center পাওয়া যায়নি।" });
    }

    const { clearCache } = require("../lib/tenantCache");
    clearCache();

    await masterDb.query(
      "INSERT INTO dev_logs (developer_id, action, details) VALUES ($1,$2,$3)",
      [req.dev.id, "change_slug", `"${oldSlug}" → "${cleanNewSlug}" (${r.rows[0].name_bn})`]
    );

    res.json({
      success: true,
      message: `Slug পরিবর্তন হয়েছে ✅ নতুন Login URL: hortnet-bd.com/${cleanNewSlug}/login`,
    });
  } catch (err) {
    console.error("change-slug error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dev/run-migration — সব center DB-তে একসাথে SQL চালানো (শুধু CREATE/ALTER, safety-checked)
router.post("/run-migration", devAuth, async (req, res) => {
  const { sql, target } = req.body;
  if (!sql || !sql.trim()) {
    return res.status(400).json({ success: false, message: "SQL দিন।" });
  }

  const upperSql = sql.toUpperCase();
  const forbidden = ["DROP ", "DELETE ", "TRUNCATE ", "UPDATE ", "GRANT ", "REVOKE "];
  const found = forbidden.find((f) => upperSql.includes(f));
  if (found) {
    return res.status(400).json({
      success: false,
      message: `নিরাপত্তার কারণে "${found.trim()}" ধরনের কমান্ড অনুমতি নেই। শুধু CREATE TABLE / ALTER TABLE ব্যবহার করুন।`,
    });
  }
  if (!upperSql.includes("CREATE TABLE") && !upperSql.includes("ALTER TABLE")) {
    return res.status(400).json({
      success: false,
      message: "শুধু CREATE TABLE বা ALTER TABLE জাতীয় statement অনুমতি আছে।",
    });
  }

  const { getTenants } = require("../lib/tenantCache");
  const { getPool } = require("../config/poolManager");
  const results = [];

  try {
    if (target === "master") {
      try {
        await masterDb.query(sql);
        results.push({ target: "master", success: true });
      } catch (e) {
        results.push({ target: "master", success: false, error: e.message });
      }
    } else {
      const tenants = await getTenants();
      const targetList = target === "all" ? Object.entries(tenants) : Object.entries(tenants).filter(([slug]) => slug === target);
      for (const [slug, tenant] of targetList) {
        if (!tenant.db_url) { results.push({ target: slug, success: false, error: "db_url নেই" }); continue; }
        try {
          const pool = getPool(tenant.db_url, tenant.db_url);
          await pool.query(sql);
          results.push({ target: slug, success: true });
        } catch (e) {
          results.push({ target: slug, success: false, error: e.message });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    await masterDb.query(
      "INSERT INTO dev_logs (developer_id, action, details) VALUES ($1,$2,$3)",
      [req.dev.id, "run_migration", `SQL চালানো হয়েছে (${target}): ${successCount}/${results.length} সফল — SQL: ${sql.slice(0, 200)}`]
    );

    res.json({ success: true, results, success_count: successCount, total: results.length });
  } catch (err) {
    console.error("run-migration error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/deploy-info — VPS-এর current git commit vs GitHub main-এর latest commit তুলনা
router.get("/deploy-info", devAuth, async (req, res) => {
  const { execSync } = require("child_process");
  const path = require("path");
  try {
    const repoRoot = path.join(__dirname, "..", ".."); // backend/routes -> project root
    let localCommit = "unknown", localDate = "unknown", localBranch = "unknown";
    try {
      localCommit = execSync("git rev-parse HEAD", { cwd: repoRoot }).toString().trim();
      localDate = execSync("git log -1 --format=%cd --date=iso", { cwd: repoRoot }).toString().trim();
      localBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot }).toString().trim();
    } catch (e) {
      console.error("git local info error:", e.message);
    }

    let remoteCommit = "unknown";
    let remoteMessage = "";
    try {
      const https = require("https");
      remoteCommit = await new Promise((resolve, reject) => {
        https.get(
          "https://api.github.com/repos/masarkerdev/hortnet-bd/commits/main",
          { headers: { "User-Agent": "hortnet-bd-deploy-check" } },
          (r) => {
            let data = "";
            r.on("data", (chunk) => (data += chunk));
            r.on("end", () => {
              try {
                const json = JSON.parse(data);
                remoteMessage = json.commit?.message || "";
                resolve(json.sha || "unknown");
              } catch (e) {
                reject(e);
              }
            });
          }
        ).on("error", reject);
      });
    } catch (e) {
      console.error("github fetch error:", e.message);
    }

    const inSync = localCommit !== "unknown" && remoteCommit !== "unknown" && localCommit === remoteCommit;

    res.json({
      success: true,
      local: { commit: localCommit, date: localDate, branch: localBranch },
      remote: { commit: remoteCommit, message: remoteMessage },
      in_sync: inSync,
    });
  } catch (err) {
    console.error("deploy-info error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/route-health — গুরুত্বপূর্ণ routes call করে দেখা কোনটা ঠিক আছে, কোনটা ভাঙা
router.get("/route-health", devAuth, async (req, res) => {
  const http = require("http");
  const PORT = process.env.PORT || 30002;

  function checkRoute(path) {
    return new Promise((resolve) => {
      const start = Date.now();
      const req2 = http.get(`http://localhost:${PORT}${path}`, (r) => {
        let body = "";
        r.on("data", (c) => (body += c));
        r.on("end", () => {
          const ms = Date.now() - start;
          let parsed = null;
          try { parsed = JSON.parse(body); } catch (e) {}
          // ৪০০/৪০১/৪০৩ মানে route ঠিকই আছে, শুধু auth/tenant তথ্য ছাড়া call করা হয়েছে —
          // শুধু ৪০৪ (route নেই) বা ৫০০+ (server error) হলেই প্রকৃত সমস্যা
          const looksOk = r.statusCode !== 404 && r.statusCode < 500;
          resolve({ path, status: r.statusCode, ms, ok: looksOk });
        });
      });
      req2.on("error", (e) => resolve({ path, status: 0, ms: Date.now() - start, ok: false, error: e.message }));
      req2.setTimeout(8000, () => { req2.destroy(); resolve({ path, status: 0, ms: 8000, ok: false, error: "timeout" }); });
    });
  }

  // এখানে গুরুত্বপূর্ণ public/basic route যোগ করা যায় (auth লাগে এমন route 401 দিলে সেটাও "ঠিক আছে" ধরা হবে,
  // কারণ route নিজে কাজ করছে, শুধু token নেই)
  const routes = [
    "/api/public/centers",
    "/api/public/search?q=test",
    "/api/reports/topsheet?fy=2026&month=7",
    "/api/reports/yearly-revenue?fy=2026",
    "/api/reports/income-report?fy=2026&month=7",
    "/api/reports/bank-deposits?fy=2026",
    "/api/superadmin/stats-all",
    "/api/superadmin/report/yearly-revenue?fy=2026",
    "/api/superadmin/report/income-report?fy=2026&month=7",
    "/api/budget/codes",
    "/api/budget-admin/periods?fy=2026",
  ];

  try {
    const results = await Promise.all(routes.map(checkRoute));
    const failCount = results.filter((r) => !r.ok).length;
    res.json({ success: true, results, fail_count: failCount, total: results.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/error-logs — সাম্প্রতিক error গুলো দেখা
router.get("/error-logs", devAuth, async (req, res) => {
  try {
    await masterDb.query(
      `CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`
    );
    const r = await masterDb.query(
      "SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 100"
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/dev/error-logs — সব error log মুছে ফেলা (পরিষ্কার করার জন্য)
router.delete("/error-logs", devAuth, async (req, res) => {
  try {
    await masterDb.query("DELETE FROM error_logs");
    res.json({ success: true, message: "সব error log মুছে ফেলা হয়েছে ✅" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/db-sizes — প্রতিটা center-এর database কত বড় হয়ে গেছে
router.get("/db-sizes", devAuth, async (req, res) => {
  const { getTenants } = require("../lib/tenantCache");
  const { getPool } = require("../config/poolManager");
  try {
    const tenants = await getTenants();
    const results = [];

    // Master DB size
    try {
      const r = await masterDb.query(
        "SELECT pg_size_pretty(pg_database_size(current_database())) AS pretty, pg_database_size(current_database()) AS bytes"
      );
      results.push({ slug: "master", name: "Master DB", pretty: r.rows[0].pretty, bytes: Number(r.rows[0].bytes) });
    } catch (e) {}

    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.db_url) continue;
      try {
        const pool = getPool(tenant.db_url, tenant.db_url);
        const r = await pool.query(
          "SELECT pg_size_pretty(pg_database_size(current_database())) AS pretty, pg_database_size(current_database()) AS bytes"
        );
        results.push({
          slug,
          name: (tenant.name_bn || "").replace("হর্টিকালচার সেন্টার,", "").trim() || tenant.name_bn,
          pretty: r.rows[0].pretty,
          bytes: Number(r.rows[0].bytes),
        });
      } catch (e) {
        results.push({ slug, name: tenant.name_bn, pretty: "❌", bytes: 0, error: e.message });
      }
    }

    results.sort((a, b) => b.bytes - a.bytes);
    const totalBytes = results.reduce((s, r) => s + r.bytes, 0);

    res.json({
      success: true,
      data: results,
      total_pretty: `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/connections — এই মুহূর্তে PostgreSQL-এ কতগুলো active connection আছে (database অনুযায়ী)
router.get("/connections", devAuth, async (req, res) => {
  try {
    const totalR = await masterDb.query("SELECT count(*) FROM pg_stat_activity");
    const maxR = await masterDb.query("SHOW max_connections");
    const byDbR = await masterDb.query(
      "SELECT datname, count(*) AS count FROM pg_stat_activity WHERE datname IS NOT NULL GROUP BY datname ORDER BY count DESC"
    );

    res.json({
      success: true,
      total: Number(totalR.rows[0].count),
      max_connections: Number(maxR.rows[0].max_connections),
      by_database: byDbR.rows.map((r) => ({ database: r.datname, count: Number(r.count) })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dev/daily-tip — বর্তমান tip/বার্তা দেখা (Dev Panel-এর জন্য)
router.get("/daily-tip", devAuth, async (req, res) => {
  try {
    await masterDb.query(
      `CREATE TABLE IF NOT EXISTS daily_tip (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`
    );
    const r = await masterDb.query("SELECT * FROM daily_tip ORDER BY id DESC LIMIT 1");
    res.json({ success: true, data: r.rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/dev/daily-tip — নতুন tip সেট করা (পুরনোটা replace হবে)
router.put("/daily-tip", devAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "লেখা দিন।" });
  }
  try {
    await masterDb.query(
      `CREATE TABLE IF NOT EXISTS daily_tip (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )`
    );
    await masterDb.query("DELETE FROM daily_tip");
    const r = await masterDb.query(
      "INSERT INTO daily_tip (content) VALUES ($1) RETURNING *",
      [content.trim()]
    );
    res.json({ success: true, data: r.rows[0], message: "আপডেট হয়েছে ✅" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
