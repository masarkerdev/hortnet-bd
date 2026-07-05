// routes/developer.js — Developer Panel (Hidden God Mode)
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { masterDb } = require("../config/masterDb");

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

module.exports = router;
