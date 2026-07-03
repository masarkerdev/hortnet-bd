// ============================================================
// এই স্ক্রিপ্ট একবারই চালান — Admin পাসওয়ার্ড সেট করতে
// কমান্ড: node db/setup-admin.js
// ============================================================
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false }
});

async function setupAdmin() {
    console.log('🌿 Admin ও Users সেটআপ শুরু হচ্ছে...\n');

    const users = [
        { name: 'Md. Amin',      email: 'amin@horticulture.bd',   password: 'Admin@1234',   role: 'admin' },
        { name: 'Salma Khatun',  email: 'salma@horticulture.bd',  password: 'Salma@1234',   role: 'sales_operator' },
        { name: 'Karim Hossain', email: 'karim@horticulture.bd',  password: 'Karim@1234',   role: 'production_officer' },
        { name: 'Rahim Babu',    email: 'rahim@horticulture.bd',  password: 'Rahim@1234',   role: 'production_officer' },
        { name: 'Nuri Begum',    email: 'nuri@horticulture.bd',   password: 'Nuri@1234',    role: 'viewer' },
    ];

    for (const u of users) {
        const hashed = await bcrypt.hash(u.password, 10);

        try {
            // আগে থাকলে আপডেট করুন, না থাকলে নতুন তৈরি
            await pool.query(
                `INSERT INTO users (name, email, password, role)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO UPDATE SET password = $3, role = $4`,
                [u.name, u.email, hashed, u.role]
            );
            console.log(`  ✅ ${u.name} (${u.role}) — তৈরি হয়েছে`);
            console.log(`     📧 Email: ${u.email}`);
            console.log(`     🔑 Password: ${u.password}\n`);
        } catch (err) {
            console.error(`  ❌ ${u.name} তৈরিতে সমস্যা:`, err.message);
        }
    }

    console.log('\n🎉 সব Users সেটআপ সম্পন্ন!');
    console.log('\n⚠️ গুরুত্বপূর্ণ: প্রথম লগইনের পরে পাসওয়ার্ড পরিবর্তন করুন!');
    console.log('\n📝 Admin Login:');
    console.log('   Email:    amin@horticulture.bd');
    console.log('   Password: Admin@1234\n');

    await pool.end();
    process.exit(0);
}

setupAdmin().catch(err => {
    console.error('❌ সমস্যা:', err);
    process.exit(1);
});
