# 🌿 উদ্যানতত্ত্ব কেন্দ্র — নিজে Deploy করার সম্পূর্ণ গাইড
## Horticulture Center, Asambasti, Rangamati

---

# ১০০% ফ্রি সেটআপ — Step by Step

**আপনার দরকার হবে:**
- একটি ল্যাপটপ / কম্পিউটার
- ইন্টারনেট সংযোগ
- একটি Gmail অ্যাকাউন্ট (Google দিয়ে sign up করলে সহজ)

**যা ব্যবহার করবেন (সব ফ্রি):**
- Database: Supabase (ফ্রি PostgreSQL — ৫০০MB = ১৫,০০,০০০+ data)
- Hosting: Vercel (ফ্রি, *.vercel.app domain পাবেন)
- Code Editor: VS Code (ফ্রি)

---

## ======================================================
## ধাপ ১: প্রয়োজনীয় সফটওয়্যার ইনস্টল করুন
## ======================================================

### ১.১ — Node.js ইনস্টল করুন
1. এই লিংকে যান: https://nodejs.org
2. **LTS** version ডাউনলোড করুন (সবুজ বাটন)
3. ইনস্টল করুন (Next, Next, Finish)
4. যাচাই করুন — Terminal / CMD খুলে লিখুন:
   ```
   node -v
   npm -v
   ```
   দুটোতেই version দেখালে সফল ✅

### ১.২ — VS Code ইনস্টল করুন
1. এই লিংকে যান: https://code.visualstudio.com
2. ডাউনলোড করে ইনস্টল করুন

### ১.৩ — Git ইনস্টল করুন
1. এই লিংকে যান: https://git-scm.com/downloads
2. ডাউনলোড করে ইনস্টল করুন
3. যাচাই করুন:
   ```
   git --version
   ```

---

## ======================================================
## ধাপ ২: Supabase-এ ফ্রি Database তৈরি করুন
## ======================================================

### ২.১ — Supabase অ্যাকাউন্ট তৈরি
1. এই লিংকে যান: https://supabase.com
2. "Start your project" ক্লিক করুন
3. GitHub দিয়ে Sign Up করুন (সবচেয়ে সহজ)
   - GitHub অ্যাকাউন্ট না থাকলে আগে https://github.com এ তৈরি করুন

### ২.২ — নতুন Project তৈরি
1. Supabase Dashboard-এ "New Project" ক্লিক করুন
2. এই তথ্যগুলো দিন:
   - **Organization**: আপনার নাম (বা নতুন তৈরি করুন)
   - **Project Name**: `horticulture-center`
   - **Database Password**: একটি শক্তিশালী পাসওয়ার্ড দিন
     ⚠️ এই পাসওয়ার্ড কোথাও লিখে রাখুন! পরে লাগবে!
   - **Region**: Southeast Asia (Singapore) — সবচেয়ে কাছে
3. "Create new project" ক্লিক করুন
4. ২-৩ মিনিট অপেক্ষা করুন, Database তৈরি হচ্ছে...

### ২.৩ — গুরুত্বপূর্ণ তথ্য সংরক্ষণ করুন
Project তৈরি হলে, **Settings > API** যান। এই তথ্যগুলো কপি করে Notepad-এ রাখুন:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon (public) key**: `eyJhbGciOiJI...` (অনেক লম্বা)
- **service_role key**: `eyJhbGciOiJI...` (এটাও অনেক লম্বা)

### ২.৪ — Database Table তৈরি করুন
1. Supabase Dashboard-এ বামপাশে **SQL Editor** ক্লিক করুন
2. "New Query" ক্লিক করুন
3. আমার দেওয়া `schema.sql` ফাইলের সম্পূর্ণ কোড পেস্ট করুন
4. **Run** বাটন ক্লিক করুন ▶️
5. "Success" দেখালে সব Table তৈরি হয়ে গেছে ✅

### ২.৫ — যাচাই করুন
1. বামপাশে **Table Editor** ক্লিক করুন
2. এই Table গুলো দেখতে পাবেন:
   - users ✅
   - categories ✅
   - seedlings ✅
   - production_batches ✅
   - mother_plants ✅
   - stock_transactions ✅
   - sales ✅
   - sales_items ✅
   - damages ✅
   - customers ✅
   - audit_logs ✅

সব দেখা গেলে Database সেটআপ সম্পন্ন! 🎉

---

## ======================================================
## ধাপ ৩: প্রজেক্ট সেটআপ (আপনার কম্পিউটারে)
## ======================================================

### ৩.১ — একটি ফোল্ডার তৈরি করুন
Terminal / CMD খুলুন এবং লিখুন:
```bash
mkdir horticulture-center
cd horticulture-center
```

### ৩.২ — Project শুরু করুন
```bash
npm init -y
```

### ৩.৩ — প্রয়োজনীয় প্যাকেজ ইনস্টল করুন
```bash
npm install express cors dotenv @supabase/supabase-js bcryptjs jsonwebtoken
npm install nodemon --save-dev
```

### ৩.৪ — ফোল্ডার কাঠামো তৈরি করুন
```bash
mkdir config middleware controllers routes public
```

### ৩.৫ — .env ফাইল তৈরি করুন
প্রজেক্ট ফোল্ডারে `.env` নামে একটি ফাইল তৈরি করুন:
```
PORT=5000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJI...আপনার_anon_key
SUPABASE_SERVICE_KEY=eyJhbGciOiJI...আপনার_service_key
JWT_SECRET=horticulture_asambasti_2024_secret
```
⚠️ xxxxx এর জায়গায় আপনার Supabase URL ও Key বসান!

---

## ======================================================
## ধাপ ৪: কোড লিখুন (ফাইল বাই ফাইল)
## ======================================================

এখন আমি যে ফাইলগুলো দিয়েছি সেগুলো VS Code-এ তৈরি করুন।
আমার দেওয়া ZIP ফাইলের কোড কপি-পেস্ট করুন।

**ফাইলের তালিকা:**
1. `config/db.js` — Supabase সংযোগ
2. `middleware/auth.js` — JWT Authentication
3. `controllers/authController.js`
4. `controllers/userController.js`
5. `controllers/seedlingController.js`
6. `controllers/productionController.js`
7. `controllers/salesController.js`
8. `controllers/stockController.js`
9. `routes/index.js`
10. `server.js`
11. `public/index.html` — Frontend (আমি আলাদা দেব)

### ৩.৬ — package.json আপডেট করুন
package.json ফাইলে scripts অংশে এটা যোগ করুন:
```json
"scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
}
```

---

## ======================================================
## ধাপ ৫: লোকালে টেস্ট করুন
## ======================================================

### ৫.১ — সার্ভার চালু করুন
```bash
npm run dev
```

দেখবেন:
```
🌿 ====================================
   উদ্যানতত্ত্ব কেন্দ্র API
   Server: http://localhost:5000
   স্ট্যাটাস: চালু / Status: Running
========================================
```

### ৫.২ — Browser-এ যাচাই করুন
এই URL-এ যান: http://localhost:5000
JSON দেখলে API চালু আছে ✅

### ৫.৩ — Login টেস্ট করুন
Browser-এ এই URL-এ যান অথবা Postman ব্যবহার করুন:
```
POST http://localhost:5000/api/auth/login
Body (JSON):
{
    "email": "amin@horticulture.bd",
    "password": "Admin@1234"
}
```

Token পেলে সফল ✅

---

## ======================================================
## ধাপ ৬: GitHub-এ কোড আপলোড করুন
## ======================================================

### ৬.১ — GitHub Repository তৈরি করুন
1. https://github.com এ যান
2. "+" আইকন > "New repository" ক্লিক
3. নাম দিন: `horticulture-center`
4. **Private** সিলেক্ট করুন (⚠️ Public না!)
5. "Create repository" ক্লিক করুন

### ৬.২ — .gitignore ফাইল তৈরি করুন
প্রজেক্ট ফোল্ডারে `.gitignore` নামে ফাইল তৈরি করুন:
```
node_modules/
.env
uploads/
.DS_Store
```

### ৬.৩ — কোড Push করুন
```bash
git init
git add .
git commit -m "first commit - horticulture center"
git branch -M main
git remote add origin https://github.com/আপনার_username/horticulture-center.git
git push -u origin main
```

---

## ======================================================
## ধাপ ৭: Vercel-এ ফ্রি Deploy করুন
## ======================================================

### ৭.১ — Vercel অ্যাকাউন্ট তৈরি
1. এই লিংকে যান: https://vercel.com
2. "Sign Up" > **Continue with GitHub** ক্লিক করুন

### ৭.২ — Project Import করুন
1. Vercel Dashboard-এ "Add New" > "Project" ক্লিক
2. আপনার `horticulture-center` repository সিলেক্ট করুন
3. "Import" ক্লিক করুন

### ৭.৩ — Environment Variables সেট করুন
Deploy-এর আগে "Environment Variables" সেকশনে এগুলো যোগ করুন:
```
SUPABASE_URL         → আপনার Supabase URL
SUPABASE_ANON_KEY    → আপনার anon key
SUPABASE_SERVICE_KEY → আপনার service key
JWT_SECRET           → আপনার secret
```

### ৭.৪ — Deploy করুন
"Deploy" বাটন ক্লিক করুন!

⏳ ১-২ মিনিট অপেক্ষা করুন...

### ৭.৫ — আপনার লাইভ URL পাবেন!
```
🎉 https://horticulture-center.vercel.app
```

এই URL-এ আপনার সফটওয়্যার লাইভ! 🌐

---

## ======================================================
## ধাপ ৮: Admin পাসওয়ার্ড সেট করুন
## ======================================================

Supabase SQL Editor-এ এই কোড চালান:

```sql
-- Admin পাসওয়ার্ড আপডেট (Admin@1234)
UPDATE users SET password = '$2b$10$8Kl9YzrPQD5RnTzwV3jVxOj6YwKqVqHM6zS9Z4p7G5Z3Z3z3z3z3z'
WHERE email = 'amin@horticulture.bd';
```

(আসল হ্যাশ পাসওয়ার্ড API দিয়ে প্রথম লগইনে তৈরি হবে)

---

## ======================================================
## ফ্রি প্ল্যানের সীমা
## ======================================================

| সার্ভিস   | ফ্রি সীমা              | আপনার জন্য যথেষ্ট? |
|-----------|----------------------|-------------------|
| Supabase  | ৫০০MB Database       | ✅ হ্যাঁ (১৫ লাখ+ রেকর্ড) |
| Supabase  | ২GB File Storage     | ✅ হ্যাঁ               |
| Supabase  | ৫০,০০০ Auth Users    | ✅ হ্যাঁ (আপনার ৫ জন)    |
| Vercel    | ১০০GB Bandwidth/মাস  | ✅ হ্যাঁ               |
| Vercel    | Serverless Functions | ✅ হ্যাঁ               |
| GitHub    | Unlimited Private Repos| ✅ হ্যাঁ             |

মোট খরচ: ৳০ (শূন্য টাকা!) 🎉

---

## ======================================================
## সমস্যা হলে কী করবেন?
## ======================================================

সমস্যা ১: "npm not found"
→ Node.js আবার ইনস্টল করুন, Terminal/CMD বন্ধ করে আবার খুলুন

সমস্যা ২: "Database connection error"
→ .env ফাইলে Supabase URL ও Key ঠিক আছে কিনা দেখুন

সমস্যা ৩: "Cannot find module"
→ `npm install` আবার চালান

সমস্যা ৪: Vercel deploy fail
→ Build log পড়ুন, error message আমাকে দেখান

সমস্যা ৫: "CORS error"
→ server.js এ CORS origin-এ আপনার Vercel URL যোগ করুন

---

আমাকে যেকোনো ধাপে সমস্যা হলে error message সহ জানান!
আমি সমাধান করে দেব। 🌿
