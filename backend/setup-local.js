// ============================================================
// HortNet-BD — লোকাল PostgreSQL-এ এক কমান্ডে সেটআপ
// কমান্ড:  node setup-local.js
// .env-এ MASTER_DB_URL, TENANT_ASAMBASTI_URL, PGSSL=off থাকতে হবে
// ============================================================
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const SSL = process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false };
const MASTER_URL = process.env.MASTER_DB_URL;
const TENANT_URL = process.env.TENANT_ASAMBASTI_URL;

if (!MASTER_URL || !TENANT_URL) {
  console.error('❌ .env-এ MASTER_DB_URL এবং TENANT_ASAMBASTI_URL দিন।');
  process.exit(1);
}

function dbName(url) { return new URL(url).pathname.replace(/^\//, ''); }
function adminUrl(url) { const u = new URL(url); u.pathname = '/postgres'; return u.toString(); }

async function ensureDatabase(url) {
  const name = dbName(url);
  const admin = new Pool({ connectionString: adminUrl(url), ssl: SSL });
  const r = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]);
  if (r.rows.length === 0) {
    await admin.query(`CREATE DATABASE "${name}"`);
    console.log(`  ✅ database তৈরি: ${name}`);
  } else {
    console.log(`  • database আছে: ${name}`);
  }
  await admin.end();
}

async function main() {
  console.log('🌿 লোকাল সেটআপ শুরু...\n');

  // ১) দুই database নিশ্চিত করো
  await ensureDatabase(MASTER_URL);
  await ensureDatabase(TENANT_URL);

  // ২) tenant schema লোড
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'tenant_schema.sql'), 'utf8');
  const tPool = new Pool({ connectionString: TENANT_URL, ssl: SSL });
  await tPool.query(schema);
  console.log('  ✅ tenant schema প্রয়োগ হলো (১৪ টেবিল + view)');

  // ৩) tenant-এ একজন admin user (না থাকলে)
  const email = 'amin@horticulture.bd';
  const exists = await tPool.query('SELECT 1 FROM users WHERE email=$1', [email]);
  if (exists.rows.length === 0) {
    const hash = bcrypt.hashSync('Admin@1234', 10);
    await tPool.query(
      "INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,'admin')",
      ['Md. Amin', email, hash],
    );
    console.log('  ✅ admin user তৈরি: amin@horticulture.bd / Admin@1234');
  } else {
    console.log('  • admin user আগেই আছে');
  }
  await tPool.end();

  // ৪) master-এ tenants টেবিল + asambasti row
  const mPool = new Pool({ connectionString: MASTER_URL, ssl: SSL });
  await mPool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'B',
      name_bn TEXT, name_en TEXT,
      district TEXT, division TEXT, location TEXT,
      db_url TEXT NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now()
    );`);
  await mPool.query(`
    INSERT INTO tenants (slug,category,name_bn,name_en,district,division,location,db_url)
    VALUES ('asambasti','B','হর্টিকালচার সেন্টার, আসামবস্তি','Horticulture Center, Asambasti','রাঙ্গামাটি','চট্টগ্রাম','আসামবস্তি, রাঙ্গামাটি',$1)
    ON CONFLICT (slug) DO UPDATE SET db_url=$1, active=true;`,
    [TENANT_URL]);
  console.log('  ✅ master-এ asambasti কেন্দ্র যুক্ত');
  await mPool.end();

  console.log('\n✅ সেটআপ সম্পূর্ণ! এখন:  node server.js');
  console.log('   লগইন:  amin@horticulture.bd / Admin@1234  (কেন্দ্র: asambasti)\n');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
