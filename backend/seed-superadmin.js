// seed-superadmin.js — প্রথম Director Super Admin তৈরি (master DB-তে)
// চালাও:  node seed-superadmin.js   (.env থেকে নিজেই পড়বে)
require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

// ==== পছন্দমতো বদলাও ====
const DIRECTOR = {
  name: "পরিচালক (Director)",
  email: "director@dae.gov.bd",
  password: "Director@1234",
  role: "director",
  district: "ঢাকা",
  division: "ঢাকা",
  phone: "01700000000",
};
// ========================

(async () => {
  const url =
    process.env.MASTER_DB_URL ||
    "postgresql://postgres:12345678@localhost:5432/v1_master";
  const useSSL = String(process.env.PGSSL || "").trim().toLowerCase() === "on";
  const pool = new Pool({
    connectionString: url,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'deputy_director',
        district TEXT, division TEXT, phone TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_center_assignments (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES super_admins(id) ON DELETE CASCADE,
        tenant_slug TEXT NOT NULL,
        UNIQUE(admin_id, tenant_slug)
      );`);

    const exists = await pool.query("SELECT id FROM super_admins WHERE email=$1", [DIRECTOR.email]);
    const hash = await bcrypt.hash(DIRECTOR.password, 10);
    if (exists.rows.length) {
      await pool.query("UPDATE super_admins SET password=$1, is_active=true, role='director' WHERE email=$2", [hash, DIRECTOR.email]);
      console.log("♻️  Director আগে ছিল — পাসওয়ার্ড রিসেট করা হলো।");
    } else {
      await pool.query(
        "INSERT INTO super_admins (name,email,password,role,district,division,phone,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,true)",
        [DIRECTOR.name, DIRECTOR.email, hash, DIRECTOR.role, DIRECTOR.district, DIRECTOR.division, DIRECTOR.phone]
      );
      console.log("✅ Director Super Admin তৈরি হলো।");
    }
    console.log("\n==== Super Admin লগইন ====");
    console.log("   পেজ:      /superadmin/login");
    console.log("   ইমেইল:    " + DIRECTOR.email);
    console.log("   পাসওয়ার্ড: " + DIRECTOR.password);
    console.log("   role:     director (সব সেন্টার)\n");
  } catch (e) {
    console.error("❌ সমস্যা:", e.message);
  } finally {
    await pool.end();
  }
})();
