// setup-developer.js — Developer account তৈরি
require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  connectionString: process.env.MASTER_DB_URL,
  ssl: false,
});

const DEVELOPER = {
  name: "Mahfuj Ahmed Sarkar",
  email: "mahfuj@hortnet-bd.com",
  password: "Dev@HortNet2026#",
};

async function setup() {
  console.log("🔧 Developer setup শুরু...");
  try {
    // Developer table তৈরি
    await pool.query(`
      CREATE TABLE IF NOT EXISTS developers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("  ✅ developers table তৈরি");

    // Dev logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dev_logs (
        id SERIAL PRIMARY KEY,
        developer_id INTEGER REFERENCES developers(id),
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("  ✅ dev_logs table তৈরি");

    // Developer account তৈরি
    const hash = await bcrypt.hash(DEVELOPER.password, 10);
    const exists = await pool.query("SELECT id FROM developers WHERE email=$1", [DEVELOPER.email]);

    if (exists.rows.length) {
      await pool.query("UPDATE developers SET password=$1, is_active=true WHERE email=$2", [hash, DEVELOPER.email]);
      console.log("  ✅ Developer account আপডেট হয়েছে");
    } else {
      await pool.query(
        "INSERT INTO developers (name,email,password) VALUES ($1,$2,$3)",
        [DEVELOPER.name, DEVELOPER.email, hash]
      );
      console.log("  ✅ Developer account তৈরি হয়েছে");
    }

    console.log("\n✅ Setup সম্পূর্ণ!");
    console.log("==== Developer Login ====");
    console.log(`   URL:      /dev/login`);
    console.log(`   Email:    ${DEVELOPER.email}`);
    console.log(`   Password: ${DEVELOPER.password}`);
    console.log(`   Secret:   (DEV_SECRET from .env)`);
  } catch (err) {
    console.error("❌ সমস্যা:", err.message);
  } finally {
    await pool.end();
  }
}

setup();
