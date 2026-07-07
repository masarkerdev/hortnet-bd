// routes/superadmin.js
const express = require("express");
const router = express.Router();

// সব superadmin routes-এ no-cache header
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const masterDb = require("../config/masterDb");
const { clearCache, getTenants } = require("../lib/tenantCache");

const SA_SECRET = process.env.SA_JWT_SECRET || "sa-secret-change-this";

function saAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ success: false, message: "Login করুন।" });
  try {
    req.saUser = jwt.verify(token, SA_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session শেষ।" });
  }
}

function directorOnly(req, res, next) {
  if (req.saUser.role !== "director")
    return res
      .status(403)
      .json({ success: false, message: "শুধু পরিচালক করতে পারবেন।" });
  next();
}

async function queryTenant(dbUrl, sql, params = []) {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: false,
    max: 1,
    connectionTimeoutMillis: 8000,
  });
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } finally {
    await pool.end();
  }
}

// ===== LOGIN =====
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await masterDb.query(
      "SELECT * FROM super_admins WHERE email=$1 AND is_active=true",
      [email],
    );
    if (!r.rows.length)
      return res
        .status(401)
        .json({ success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল।" });

    const isMatch = await bcrypt.compare(password, r.rows[0].password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল।" });

    const assignments = await masterDb.query(
      "SELECT tenant_slug FROM admin_center_assignments WHERE admin_id=$1",
      [r.rows[0].id],
    );
    const assignedCenters = assignments.rows.map((a) => a.tenant_slug);

    const token = jwt.sign(
      {
        id: r.rows[0].id,
        email: r.rows[0].email,
        name: r.rows[0].name,
        role: r.rows[0].role,
        district: r.rows[0].district,
        division: r.rows[0].division,
        assignedCenters: assignedCenters,
      },
      SA_SECRET,
      { expiresIn: "8h" },
    );
    res.json({
      success: true,
      token,
      name: r.rows[0].name,
      role: r.rows[0].role,
      assignedCenters,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== TENANT LIST =====
router.get("/tenants", saAuth, async (req, res) => {
  try {
    let query =
      "SELECT id,slug,name_bn,name_en,location,district,division,dae_region,category,currency,mobile,active,created_at FROM tenants";
    let params = [];
    if (
      req.saUser.role !== "director" &&
      req.saUser.assignedCenters?.length > 0
    ) {
      const placeholders = req.saUser.assignedCenters
        .map((_, i) => `$${i + 1}`)
        .join(",");
      query += ` WHERE slug IN (${placeholders})`;
      params = req.saUser.assignedCenters;
    }
    query += " ORDER BY category, slug";
    const r = await masterDb.query(query, params);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ALL CENTER STATS =====
router.get("/stats-all", saAuth, async (req, res) => {
  try {
    if (req.query.force === "true") clearCache();

    const tenants = await getTenants();
    let tenantEntries = Object.entries(tenants);

    if (
      req.saUser.role !== "director" &&
      req.saUser.assignedCenters?.length > 0
    ) {
      tenantEntries = tenantEntries.filter(([slug]) =>
        req.saUser.assignedCenters.includes(slug),
      );
    }

    const results = await Promise.all(
      tenantEntries.map(async ([slug, tenant]) => {
        try {
          const now = new Date();
          const curMonth = now.getMonth() + 1;
          const curYear = now.getFullYear();
          const fyStart = curMonth >= 7 ? curYear : curYear - 1;

          const [
            sales,
            todaySales,
            currentMonth,
            lastMonth,
            monthlyTarget,
            production,
            stock,
            lowStock,
            annualProdTarget,
            monthlyProdTarget,
            monthlyProdAchieved,
          ] = await Promise.all([
            queryTenant(
              tenant.db_url,
              `SELECT COALESCE(SUM(total_amount),0) AS total_revenue, COUNT(*) AS total_invoices FROM sales`,
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COALESCE(SUM(total_amount),0) AS today_revenue FROM sales WHERE sale_date=CURRENT_DATE`,
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COALESCE(SUM(total_amount),0) AS revenue FROM sales WHERE EXTRACT(MONTH FROM sale_date)=EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM sale_date)=EXTRACT(YEAR FROM NOW())`,
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COALESCE(SUM(total_amount),0) AS revenue FROM sales WHERE EXTRACT(MONTH FROM sale_date)=EXTRACT(MONTH FROM NOW()-INTERVAL '1 month') AND EXTRACT(YEAR FROM sale_date)=EXTRACT(YEAR FROM (NOW()-INTERVAL '1 month'))`,
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COALESCE(target_amount,0) AS target_amount FROM targets WHERE target_type='sales' AND target_month=EXTRACT(MONTH FROM NOW()) AND target_year=EXTRACT(YEAR FROM NOW()) LIMIT 1`,
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COUNT(*) AS total_batches, COALESCE(SUM(produced_quantity),0) AS total_produced, COALESCE(AVG(CASE WHEN success_percent>0 THEN success_percent END),0) AS avg_success, COALESCE(SUM(available_quantity),0) AS total_available FROM production_batches`,
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COALESCE(SUM(current_stock),0) AS total_stock, COALESCE(SUM(current_stock*unit_price),0) AS stock_value, COUNT(*) AS total_species FROM seedlings WHERE is_active=true`,
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COUNT(*) AS low_count FROM seedlings WHERE is_active=true AND current_stock<=min_stock_alert`,
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COALESCE(target_quantity,0) AS qty FROM targets WHERE target_type='production' AND target_month=0 AND target_year=$1 LIMIT 1`,
              [fyStart],
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COALESCE(target_quantity,0) AS qty FROM targets WHERE target_type='production' AND target_month=$1 AND target_year=$2 LIMIT 1`,
              [curMonth, curYear],
            ),
            queryTenant(
              tenant.db_url,
              `SELECT COALESCE(SUM(produced_quantity),0) AS qty FROM production_batches WHERE EXTRACT(MONTH FROM sowing_date)=$1 AND EXTRACT(YEAR FROM sowing_date)=$2`,
              [curMonth, curYear],
            ),
          ]);

          const curRev = parseFloat(currentMonth[0].revenue);
          const lastRev = parseFloat(lastMonth[0].revenue);
          const growthRate =
            lastRev > 0
              ? ((curRev - lastRev) / lastRev) * 100
              : curRev > 0
                ? 100
                : 0;
          const targetAmt = parseFloat(monthlyTarget[0]?.target_amount || 0);
          const targetAchv =
            targetAmt > 0 ? Math.min((curRev / targetAmt) * 100, 200) : null;
          const totalSpecies = parseInt(stock[0].total_species) || 1;
          const lowCount = parseInt(lowStock[0].low_count) || 0;
          const stockHealth = Math.max(0, 1 - lowCount / totalSpecies) * 100;
          const successRate = parseFloat(production[0].avg_success) || 0;
          const perfScore = Math.round(
            Math.min(Math.max(growthRate + 50, 0), 100) * 0.3 +
              (targetAchv !== null ? Math.min(targetAchv, 100) : stockHealth) *
                0.3 +
              successRate * 0.2 +
              stockHealth * 0.2,
          );

          return {
            slug,
            name_bn: tenant.name_bn,
            name_en: tenant.name_en,
            location: tenant.location,
            category: tenant.category,
            district: tenant.district,
            division: tenant.division,
            total_revenue: parseFloat(sales[0].total_revenue),
            total_invoices: parseInt(sales[0].total_invoices),
            today_revenue: parseFloat(todaySales[0].today_revenue),
            total_produced: parseInt(production[0].total_produced),
            total_stock: parseInt(stock[0].total_stock),
            stock_value: parseFloat(stock[0].stock_value),
            current_month_rev: curRev,
            last_month_rev: lastRev,
            growth_rate: parseFloat(growthRate.toFixed(1)),
            target_amount: targetAmt,
            target_achieved: targetAchv,
            avg_success: parseFloat(successRate.toFixed(1)),
            low_stock_count: lowCount,
            total_species: parseInt(stock[0].total_species),
            stock_health: parseFloat(stockHealth.toFixed(1)),
            rev_per_batch: parseFloat(
              (
                parseFloat(sales[0].total_revenue) /
                (parseInt(production[0].total_batches) || 1)
              ).toFixed(0),
            ),
            perf_score: perfScore,
            traffic_light:
              perfScore >= 70 ? "green" : perfScore >= 45 ? "yellow" : "red",
            annual_prod_target: parseInt(annualProdTarget[0]?.qty || 0),
            monthly_prod_target: parseInt(monthlyProdTarget[0]?.qty || 0),
            monthly_prod_achieved: parseInt(monthlyProdAchieved[0]?.qty || 0),
            status: "ok",
          };
        } catch (e) {
          return {
            slug,
            name_en: tenant.name_en,
            name_bn: tenant.name_bn,
            status: "error",
            error: e.message,
          };
        }
      }),
    );
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== CENTER DETAIL =====
router.get("/center/:slug", saAuth, async (req, res) => {
  if (
    req.saUser.role !== "director" &&
    req.saUser.assignedCenters?.length > 0
  ) {
    if (!req.saUser.assignedCenters.includes(req.params.slug)) {
      return res
        .status(403)
        .json({ success: false, message: "এই center দেখার অনুমতি নেই।" });
    }
  }
  try {
    const tenants = await getTenants();
    const tenant = tenants[req.params.slug];
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "Center পাওয়া যায়নি।" });

    const [
      salesSummary,
      todaySales,
      monthlySales,
      productionSummary,
      productionByType,
      stockSummary,
      lowStock,
      damagesSummary,
      topSeedlings,
      recentSales,
      recentBatches,
      users,
      otherIncome,
      targets,
      categories,
      fyTargets,
      fyProdAchieved,
      fySalesAchieved,
    ] = await Promise.all([
      queryTenant(
        tenant.db_url,
        `SELECT COUNT(*) AS total_invoices, COALESCE(SUM(total_amount),0) AS total_revenue, COALESCE(SUM(discount),0) AS total_discount, COALESCE(SUM(CASE WHEN payment_status='due' THEN total_amount ELSE 0 END),0) AS due_amount, COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END),0) AS paid_amount FROM sales`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT COALESCE(SUM(total_amount),0) AS today_revenue, COUNT(*) AS today_invoices FROM sales WHERE sale_date=CURRENT_DATE`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT TO_CHAR(sale_date,'YYYY-MM') AS month, TO_CHAR(sale_date,'Mon YY') AS label, COALESCE(SUM(total_amount),0) AS revenue, COUNT(*) AS invoices FROM sales WHERE sale_date>=NOW()-INTERVAL '6 months' GROUP BY month,label ORDER BY month`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT COUNT(*) AS total_batches, COALESCE(SUM(produced_quantity),0) AS total_produced, COALESCE(SUM(success_quantity),0) AS total_success, COALESCE(SUM(failed_quantity),0) AS total_failed, COALESCE(SUM(available_quantity),0) AS total_available, COALESCE(AVG(CASE WHEN success_percent>0 THEN success_percent END),0) AS avg_success, COUNT(CASE WHEN status='active' THEN 1 END) AS active_batches FROM production_batches`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT production_type, COUNT(*) AS batches, COALESCE(SUM(produced_quantity),0) AS total_qty FROM production_batches GROUP BY production_type ORDER BY total_qty DESC`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT COUNT(*) AS total_species, COALESCE(SUM(current_stock),0) AS total_stock, COALESCE(SUM(current_stock*unit_price),0) AS stock_value, COUNT(CASE WHEN current_stock<=min_stock_alert THEN 1 END) AS low_stock_count FROM seedlings WHERE is_active=true`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT s.name_bn, s.seedling_code, s.current_stock, s.min_stock_alert, c.name_bn AS category FROM seedlings s LEFT JOIN categories c ON s.category_id=c.id WHERE s.is_active=true AND s.current_stock<=s.min_stock_alert ORDER BY s.current_stock ASC LIMIT 8`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT COUNT(*) AS total_reports, COALESCE(SUM(quantity),0) AS total_damaged, reason, COUNT(*) AS count FROM damages GROUP BY reason ORDER BY count DESC`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT s.name_bn, s.variety, s.unit_price, s.current_stock, COALESCE(SUM(si.quantity),0) AS total_sold, COALESCE(SUM(si.total_price),0) AS revenue, COUNT(DISTINCT si.sale_id) AS orders FROM seedlings s LEFT JOIN sales_items si ON s.id=si.seedling_id WHERE s.is_active=true GROUP BY s.id,s.name_bn,s.variety,s.unit_price,s.current_stock ORDER BY total_sold DESC LIMIT 8`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT s.invoice_no, s.customer_name, s.customer_phone, s.total_amount, s.payment_method, s.payment_status, s.sale_date FROM sales s ORDER BY s.created_at DESC LIMIT 8`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT pb.batch_code, s.name_bn AS seedling, pb.production_type, pb.produced_quantity, pb.available_quantity, pb.status, pb.created_at FROM production_batches pb LEFT JOIN seedlings s ON pb.seedling_id=s.id ORDER BY pb.created_at DESC LIMIT 6`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT id,name,email,role,is_active,created_at FROM users ORDER BY created_at DESC`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT income_type, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM other_income GROUP BY income_type`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT target_type,target_month,target_year,target_quantity,target_amount,remarks FROM targets ORDER BY target_year DESC, target_type, target_month`,
      ),
      queryTenant(
        tenant.db_url,
        `SELECT c.name_bn, COUNT(s.id) AS seedling_count, COALESCE(SUM(s.current_stock),0) AS total_stock FROM categories c LEFT JOIN seedlings s ON c.id=s.category_id AND s.is_active=true GROUP BY c.id,c.name_bn ORDER BY seedling_count DESC`,
      ),
      (async () => {
        const now = new Date();
        const fyS =
          now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
        const fyE = fyS + 1;
        return queryTenant(
          tenant.db_url,
          `SELECT target_type,target_month,target_year,target_quantity,target_amount,remarks FROM targets WHERE (target_year=$1 AND target_month=0) OR (target_year=$1 AND target_month BETWEEN 7 AND 12) OR (target_year=$2 AND target_month BETWEEN 1 AND 6) ORDER BY target_type,target_month`,
          [fyS, fyE],
        );
      })(),
      (async () => {
        const now = new Date();
        const fyS =
          now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
        const fyE = fyS + 1;
        return queryTenant(
          tenant.db_url,
          `SELECT COALESCE(SUM(available_quantity),0) AS total FROM production_batches WHERE (EXTRACT(YEAR FROM sowing_date)=$1 AND EXTRACT(MONTH FROM sowing_date)>=7) OR (EXTRACT(YEAR FROM sowing_date)=$2 AND EXTRACT(MONTH FROM sowing_date)<=6)`,
          [fyS, fyE],
        );
      })(),
      (async () => {
        const now = new Date();
        const fyS =
          now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
        const fyE = fyS + 1;
        return queryTenant(
          tenant.db_url,
          `SELECT COALESCE(SUM(total_amount),0) AS total FROM sales WHERE (EXTRACT(YEAR FROM sale_date)=$1 AND EXTRACT(MONTH FROM sale_date)>=7) OR (EXTRACT(YEAR FROM sale_date)=$2 AND EXTRACT(MONTH FROM sale_date)<=6)`,
          [fyS, fyE],
        );
      })(),
    ]);

    res.json({
      success: true,
      center: {
        slug: req.params.slug,
        name_bn: tenant.name_bn,
        name_en: tenant.name_en,
        location: tenant.location,
        currency: tenant.currency,
        category: tenant.category,
      },
      sales: {
        summary: salesSummary[0],
        today: todaySales[0],
        monthly: monthlySales,
        recent: recentSales,
      },
      production: {
        summary: productionSummary[0],
        by_type: productionByType,
        recent: recentBatches,
      },
      stock: {
        summary: stockSummary[0],
        low_stock: lowStock,
        categories: categories,
      },
      damages: {
        total_damaged: damagesSummary.reduce(
          (s, r) => s + parseInt(r.total_damaged || 0),
          0,
        ),
        total_reports: parseInt(damagesSummary[0]?.total_reports || 0),
        by_reason: damagesSummary,
      },
      top_seedlings: topSeedlings,
      users: users,
      other_income: {
        breakdown: otherIncome,
        total: otherIncome.reduce((s, r) => s + parseFloat(r.total || 0), 0),
      },
      targets: targets,
      fy_data: {
        fy:
          new Date().getMonth() >= 6
            ? new Date().getFullYear()
            : new Date().getFullYear() - 1,
        targets: fyTargets,
        prod_achieved: parseInt(fyProdAchieved[0]?.total || 0),
        sales_achieved: parseFloat(fySalesAchieved[0]?.total || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== TENANT CRUD (Director only) =====
router.post("/tenants", saAuth, directorOnly, async (req, res) => {
  const {
    slug,
    name_bn,
    name_en,
    location,
    district,
    division,
    dae_region,
    category,
    db_url,
    currency,
    mobile,
  } = req.body;
  if (!slug || !name_bn || !name_en || !db_url)
    return res.status(400).json({ success: false, message: "সব তথ্য দিন।" });
  try {
    const ex = await masterDb.query("SELECT id FROM tenants WHERE slug=$1", [
      slug,
    ]);
    if (ex.rows.length)
      return res
        .status(400)
        .json({ success: false, message: "এই slug আগে থেকে আছে।" });
    const r = await masterDb.query(
      `INSERT INTO tenants (slug,name_bn,name_en,location,district,division,dae_region,category,db_url,currency,mobile,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) RETURNING id,slug,name_bn`,
      [
        slug.toLowerCase(),
        name_bn,
        name_en,
        location || "",
        district || "",
        division || "",
        dae_region || "",
        category || "B",
        db_url,
        currency || "BDT",
        mobile || "",
      ],
    );
    clearCache();
    res.json({
      success: true,
      message: `"${name_bn}" যোগ হয়েছে।`,
      data: r.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/tenants/:id", saAuth, directorOnly, async (req, res) => {
  const {
    name_bn,
    name_en,
    location,
    district,
    division,
    dae_region,
    category,
    db_url,
    currency,
    active,
    mobile,
  } = req.body;
  try {
    // db_url খালি হলে পুরোনো URL রাখব
    let finalDbUrl = db_url;
    if (!finalDbUrl) {
      const cur = await masterDb.query("SELECT db_url FROM tenants WHERE id=$1", [req.params.id]);
      finalDbUrl = cur.rows[0]?.db_url || "";
    }
    await masterDb.query(
      `UPDATE tenants SET name_bn=$1,name_en=$2,location=$3,district=$4,division=$5,dae_region=$6,category=$7,db_url=$8,currency=$9,active=$10,mobile=$11,updated_at=NOW() WHERE id=$12`,
      [
        name_bn,
        name_en,
        location || "",
        district || "",
        division || "",
        dae_region || "",
        category || "B",
        finalDbUrl,
        currency || "BDT",
        active,
        mobile || "",
        req.params.id,
      ],
    );
    clearCache();
    res.json({ success: true, message: "আপডেট হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/tenants/:id/toggle", saAuth, directorOnly, async (req, res) => {
  try {
    const cur = await masterDb.query(
      "SELECT active,name_bn FROM tenants WHERE id=$1",
      [req.params.id],
    );
    if (!cur.rows.length)
      return res
        .status(404)
        .json({ success: false, message: "পাওয়া যায়নি।" });
    const newStatus = !cur.rows[0].active;
    await masterDb.query(
      "UPDATE tenants SET active=$1,updated_at=NOW() WHERE id=$2",
      [newStatus, req.params.id],
    );
    clearCache();
    res.json({
      success: true,
      message: cur.rows[0].name_bn + (newStatus ? " সক্রিয়।" : " বন্ধ।"),
      active: newStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/tenants/:id", saAuth, directorOnly, async (req, res) => {
  try {
    await masterDb.query("DELETE FROM tenants WHERE id=$1", [req.params.id]);
    clearCache();
    res.json({ success: true, message: "মুছে ফেলা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ADMIN MANAGEMENT (Director only) =====
router.get("/admins", saAuth, directorOnly, async (req, res) => {
  try {
    const r = await masterDb.query(
      `SELECT sa.id, sa.name, sa.email, sa.role, sa.district, sa.division, sa.phone, sa.is_active, sa.created_at,
             COALESCE(json_agg(aca.tenant_slug) FILTER (WHERE aca.tenant_slug IS NOT NULL), '[]') AS assigned_centers
             FROM super_admins sa
             LEFT JOIN admin_center_assignments aca ON sa.id = aca.admin_id
             GROUP BY sa.id ORDER BY sa.role, sa.name`,
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/admins", saAuth, directorOnly, async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    district,
    division,
    phone,
    assigned_centers,
  } = req.body;
  if (!name || !email || !password || !role)
    return res
      .status(400)
      .json({ success: false, message: "নাম, ইমেইল, পাসওয়ার্ড ও পদবী দিন।" });
  try {
    const ex = await masterDb.query(
      "SELECT id FROM super_admins WHERE email=$1",
      [email],
    );
    if (ex.rows.length)
      return res
        .status(400)
        .json({ success: false, message: "এই ইমেইল আগে থেকে আছে।" });
    const hash = await bcrypt.hash(password, 10);
    const r = await masterDb.query(
      `INSERT INTO super_admins (name,email,password,role,district,division,phone,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,
      [name, email, hash, role, district || "", division || "", phone || ""],
    );
    const adminId = r.rows[0].id;
    if (assigned_centers?.length > 0) {
      const values = assigned_centers
        .map((slug) => `(${adminId},'${slug}')`)
        .join(",");
      await masterDb.query(
        `INSERT INTO admin_center_assignments (admin_id,tenant_slug) VALUES ${values}`,
      );
    }
    res.json({ success: true, message: `"${name}" তৈরি হয়েছে।`, id: adminId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/admins/:id", saAuth, directorOnly, async (req, res) => {
  const { name, email, role, district, division, phone, is_active, password } =
    req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await masterDb.query(
        `UPDATE super_admins SET name=$1,email=$2,role=$3,district=$4,division=$5,phone=$6,is_active=$7,password=$8 WHERE id=$9`,
        [
          name,
          email,
          role,
          district || "",
          division || "",
          phone || "",
          is_active,
          hash,
          req.params.id,
        ],
      );
    } else {
      await masterDb.query(
        `UPDATE super_admins SET name=$1,email=$2,role=$3,district=$4,division=$5,phone=$6,is_active=$7 WHERE id=$8`,
        [
          name,
          email,
          role,
          district || "",
          division || "",
          phone || "",
          is_active,
          req.params.id,
        ],
      );
    }
    res.json({ success: true, message: "আপডেট হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/admins/:id", saAuth, directorOnly, async (req, res) => {
  try {
    await masterDb.query(
      "DELETE FROM admin_center_assignments WHERE admin_id=$1",
      [req.params.id],
    );
    await masterDb.query("DELETE FROM super_admins WHERE id=$1", [
      req.params.id,
    ]);
    res.json({ success: true, message: "মুছে ফেলা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put(
  "/admins/:id/assignments",
  saAuth,
  directorOnly,
  async (req, res) => {
    const { assigned_centers } = req.body;
    try {
      await masterDb.query(
        "DELETE FROM admin_center_assignments WHERE admin_id=$1",
        [req.params.id],
      );
      if (assigned_centers?.length > 0) {
        const values = assigned_centers
          .map((slug) => `(${req.params.id},'${slug}')`)
          .join(",");
        await masterDb.query(
          `INSERT INTO admin_center_assignments (admin_id,tenant_slug) VALUES ${values}`,
        );
      }
      res.json({ success: true, message: "Assignment আপডেট হয়েছে।" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ===== CENTER FY TARGETS =====
router.get("/center/:slug/targets", saAuth, async (req, res) => {
  if (
    req.saUser.role !== "director" &&
    req.saUser.assignedCenters?.length > 0
  ) {
    if (!req.saUser.assignedCenters.includes(req.params.slug))
      return res.status(403).json({ success: false, message: "অনুমতি নেই।" });
  }
  try {
    const tenants = await getTenants();
    const tenant = tenants[req.params.slug];
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "Center পাওয়া যায়নি।" });

    const fy = parseInt(req.query.fy) || new Date().getFullYear();
    const fyStart = fy;
    const fyEnd = fy + 1;

    const [targets, prodAchieved, salesAchieved] = await Promise.all([
      queryTenant(
        tenant.db_url,
        `SELECT target_type, target_month, target_year, target_quantity, target_amount, remarks
                 FROM targets
                 WHERE (target_year=$1 AND target_month = 0)
                    OR (target_year=$1 AND target_month BETWEEN 7 AND 12)
                    OR (target_year=$2 AND target_month BETWEEN 1 AND 6)
                 ORDER BY target_type, target_month`,
        [fyStart, fyEnd],
      ),
      queryTenant(
        tenant.db_url,
        `SELECT COALESCE(SUM(available_quantity),0) AS total
                 FROM production_batches
                 WHERE (EXTRACT(YEAR FROM sowing_date)=$1 AND EXTRACT(MONTH FROM sowing_date)>=7)
                    OR (EXTRACT(YEAR FROM sowing_date)=$2 AND EXTRACT(MONTH FROM sowing_date)<=6)`,
        [fyStart, fyEnd],
      ),
      queryTenant(
        tenant.db_url,
        `SELECT COALESCE(SUM(total_amount),0) AS total
                 FROM sales
                 WHERE (EXTRACT(YEAR FROM sale_date)=$1 AND EXTRACT(MONTH FROM sale_date)>=7)
                    OR (EXTRACT(YEAR FROM sale_date)=$2 AND EXTRACT(MONTH FROM sale_date)<=6)`,
        [fyStart, fyEnd],
      ),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      fy: `${fyStart}-${fyEnd}`,
      targets,
      prod_achieved: parseInt(prodAchieved[0]?.total || 0),
      sales_achieved: parseFloat(salesAchieved[0]?.total || 0),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== EMPLOYEES — ALL CENTERS OVERVIEW =====
router.get("/employees-all", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    let entries = Object.entries(tenants);
    if (
      req.saUser.role !== "director" &&
      req.saUser.assignedCenters?.length > 0
    ) {
      entries = entries.filter(([slug]) =>
        req.saUser.assignedCenters.includes(slug),
      );
    }
    const results = await Promise.all(
      entries.map(async ([slug, tenant]) => {
        try {
          const [summary, byDesig] = await Promise.all([
            queryTenant(
              tenant.db_url,
              `
                        SELECT
                            COUNT(CASE WHEN staff_type='permanent' AND status='active' THEN 1 END)::int AS permanent_active,
                            COUNT(CASE WHEN staff_type='temporary' AND status='active' THEN 1 END)::int AS temporary_active,
                            COUNT(CASE WHEN status='active' THEN 1 END)::int AS total_active
                        FROM employees
                    `,
            ),
            queryTenant(
              tenant.db_url,
              `
                        SELECT designation, COUNT(*)::int AS count
                        FROM employees
                        WHERE status='active' AND staff_type='permanent'
                        GROUP BY designation ORDER BY designation
                    `,
            ),
          ]);
          return {
            slug,
            name_bn: tenant.name_bn,
            location: tenant.location,
            category: tenant.category || "B",
            permanent: summary[0].permanent_active || 0,
            temporary: summary[0].temporary_active || 0,
            total: summary[0].total_active || 0,
            by_desig: byDesig,
            status: "ok",
          };
        } catch (e) {
          return {
            slug,
            name_bn: tenant.name_bn,
            status: "error",
            error: e.message,
          };
        }
      }),
    );
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== EMPLOYEES — SINGLE CENTER DETAIL =====
router.get("/center/:slug/employees", saAuth, async (req, res) => {
  if (
    req.saUser.role !== "director" &&
    req.saUser.assignedCenters?.length > 0
  ) {
    if (!req.saUser.assignedCenters.includes(req.params.slug))
      return res.status(403).json({ success: false, message: "অনুমতি নেই।" });
  }
  try {
    const tenants = await getTenants();
    const tenant = tenants[req.params.slug];
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "Center পাওয়া যায়নি।" });

    const [permanent, temporary] = await Promise.all([
      queryTenant(
        tenant.db_url,
        `
                SELECT name_bn, designation, employee_id, join_date, mobile, status
                FROM employees WHERE staff_type='permanent' ORDER BY designation, name_bn
            `,
      ),
      queryTenant(
        tenant.db_url,
        `
                SELECT name_bn, designation, worker_type, mobile, status
                FROM employees WHERE staff_type='temporary' ORDER BY name_bn
            `,
      ),
    ]);
    res.json({
      success: true,
      category: tenant.category || "B",
      permanent,
      temporary,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════

router.post("/center/:slug/set-target", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    const tenant = tenants[req.params.slug];
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "সেন্টার পাওয়া যায়নি।" });
    }

    const {
      target_type,
      target_month,
      target_year,
      target_quantity,
      target_amount,
      notes,
    } = req.body;

    if (!target_type || !target_year) {
      return res
        .status(400)
        .json({ success: false, message: "লক্ষ্যমাত্রার ধরন ও বছর দিন।" });
    }

    // Center-এর নিজস্ব DB-তে connect করো
    const pool = new Pool({
      connectionString: tenant.db_url,
      ssl: false,
      max: 1,
      connectionTimeoutMillis: 8000,
    });

    try {
      const month = target_month || 0;

      // আগে দেখো এই target আছে কিনা
      const existing = await pool.query(
        `SELECT id FROM targets
         WHERE target_type = $1
           AND target_year = $2
           AND target_month = $3
         LIMIT 1`,
        [target_type, target_year, month],
      );

      if (existing.rows.length > 0) {
        // থাকলে update করো
        await pool.query(
          `UPDATE targets
           SET target_quantity = $1,
               target_amount   = $2,
               notes           = $3
           WHERE target_type  = $4
             AND target_year  = $5
             AND target_month = $6`,
          [
            target_quantity || 0,
            target_amount || 0,
            notes || "",
            target_type,
            target_year,
            month,
          ],
        );
      } else {
        // না থাকলে insert করো
        await pool.query(
          `INSERT INTO targets
             (target_type, target_month, target_year, target_quantity, target_amount, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            target_type,
            month,
            target_year,
            target_quantity || 0,
            target_amount || 0,
            notes || "",
          ],
        );
      }

      const centerName = tenant.name_bn || req.params.slug;
      res.json({
        success: true,
        message: `${centerName}-এর লক্ষ্যমাত্রা নির্ধারণ হয়েছে ✅`,
      });
    } finally {
      await pool.end();
    }
  } catch (err) {
    console.error("set-target error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════

router.post("/center/:slug/set-target", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    const tenant = tenants[req.params.slug];
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "সেন্টার পাওয়া যায়নি।" });
    }

    const {
      target_type,
      target_month,
      target_year,
      target_quantity,
      target_amount,
      notes,
    } = req.body;

    if (!target_type || !target_year) {
      return res
        .status(400)
        .json({ success: false, message: "লক্ষ্যমাত্রার ধরন ও বছর দিন।" });
    }

    // Center-এর নিজস্ব DB-তে connect করো
    const pool = new Pool({
      connectionString: tenant.db_url,
      ssl: false,
      max: 1,
      connectionTimeoutMillis: 8000,
    });

    try {
      const month = target_month || 0;

      // আগে দেখো এই target আছে কিনা
      const existing = await pool.query(
        `SELECT id FROM targets
         WHERE target_type = $1
           AND target_year = $2
           AND target_month = $3
         LIMIT 1`,
        [target_type, target_year, month],
      );

      if (existing.rows.length > 0) {
        // থাকলে update করো
        await pool.query(
          `UPDATE targets
           SET target_quantity = $1,
               target_amount   = $2,
               notes           = $3
           WHERE target_type  = $4
             AND target_year  = $5
             AND target_month = $6`,
          [
            target_quantity || 0,
            target_amount || 0,
            notes || "",
            target_type,
            target_year,
            month,
          ],
        );
      } else {
        // না থাকলে insert করো
        await pool.query(
          `INSERT INTO targets
             (target_type, target_month, target_year, target_quantity, target_amount, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            target_type,
            month,
            target_year,
            target_quantity || 0,
            target_amount || 0,
            notes || "",
          ],
        );
      }

      const centerName = tenant.name_bn || req.params.slug;
      res.json({
        success: true,
        message: `${centerName}-এর লক্ষ্যমাত্রা নির্ধারণ হয়েছে ✅`,
      });
    } finally {
      await pool.end();
    }
  } catch (err) {
    console.error("set-target error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 
// ── CENTER APP USER MANAGEMENT ──

// GET /api/superadmin/center-users
router.get("/center-users", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    const { getPool } = require("../config/poolManager");
    const results = [];
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const r = await db.query(
          "SELECT id, name, email, role, is_active, created_at FROM users WHERE role='admin' ORDER BY created_at DESC"
        );
        r.rows.forEach(u => results.push({ ...u, center_slug: slug, center_name: tenant.name_bn }));
      } catch (e) {}
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/superadmin/center-users
router.post("/center-users", saAuth, directorOnly, async (req, res) => {
  const { center_slug, name, email, password, role } = req.body;
  if (!center_slug || !name || !email || !password || !role)
    return res.status(400).json({ success: false, message: "সব তথ্য দিন।" });
  try {
    const tenants = await getTenants();
    const tenant = tenants[center_slug];
    if (!tenant) return res.status(404).json({ success: false, message: "Center পাওয়া যায়নি।" });
    const { getPool } = require("../config/poolManager");
    const bcrypt = require("bcryptjs");
    const db = getPool(tenant.db_url, center_slug);
    const exists = await db.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length)
      return res.status(400).json({ success: false, message: "এই email আগে থেকে আছে।" });
    const hash = await bcrypt.hash(password, 10);
    const r = await db.query(
      "INSERT INTO users (name, email, password, role, is_active) VALUES ($1,$2,$3,$4,true) RETURNING id, name, email, role",
      [name, email, hash, role]
    );
    res.json({ success: true, message: `"${name}" তৈরি হয়েছে।`, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/superadmin/center-users/:slug/:id
router.put("/center-users/:slug/:id", saAuth, directorOnly, async (req, res) => {
  const { slug, id } = req.params;
  const { name, email, role, password } = req.body;
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "Center পাওয়া যায়নি।" });
    const { getPool } = require("../config/poolManager");
    const bcrypt = require("bcryptjs");
    const db = getPool(tenant.db_url, slug);
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query("UPDATE users SET name=$1, email=$2, role=$3, password=$4 WHERE id=$5", [name, email, role, hash, id]);
    } else {
      await db.query("UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4", [name, email, role, id]);
    }
    res.json({ success: true, message: "আপডেট হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/superadmin/center-users/:slug/:id/toggle
router.post("/center-users/:slug/:id/toggle", saAuth, directorOnly, async (req, res) => {
  const { slug, id } = req.params;
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "Center পাওয়া যায়নি।" });
    const { getPool } = require("../config/poolManager");
    const db = getPool(tenant.db_url, slug);
    const cur = await db.query("SELECT is_active FROM users WHERE id=$1", [id]);
    if (!cur.rows.length) return res.status(404).json({ success: false, message: "User পাওয়া যায়নি।" });
    const newStatus = !cur.rows[0].is_active;
    await db.query("UPDATE users SET is_active=$1 WHERE id=$2", [newStatus, id]);
    res.json({ success: true, message: newStatus ? "সক্রিয় করা হয়েছে।" : "বন্ধ করা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/superadmin/center-users/:slug/:id/reset-password
router.post("/center-users/:slug/:id/reset-password", saAuth, directorOnly, async (req, res) => {
  const { slug, id } = req.params;
  const { new_password } = req.body;
  if (!new_password) return res.status(400).json({ success: false, message: "নতুন password দিন।" });
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "Center পাওয়া যায়নি।" });
    const { getPool } = require("../config/poolManager");
    const bcrypt = require("bcryptjs");
    const db = getPool(tenant.db_url, slug);
    const hash = await bcrypt.hash(new_password, 10);
    await db.query("UPDATE users SET password=$1 WHERE id=$2", [hash, id]);
    res.json({ success: true, message: "Password reset হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── REPORT ROUTES ──

// GET /api/superadmin/report/stock-summary
router.get("/report/stock-summary", saAuth, async (req, res) => {
  try {
    const { category } = req.query;
    const tenants = await getTenants();
    const { getPool } = require("../config/poolManager");
    const results = [];
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        let q = `SELECT s.name_bn, s.variety, s.unit_price, s.current_stock, s.seedling_code, c.name_bn AS category_bn FROM seedlings s LEFT JOIN categories c ON s.category_id = c.id WHERE s.is_active = true`;
        const params = [];
        if (category) { params.push(category); q += ` AND c.name_bn = $${params.length}`; }
        q += ` ORDER BY c.name_bn, s.name_bn, s.variety`;
        const r = await db.query(q, params);
        results.push({ slug, name_bn: tenant.name_bn, name_en: tenant.name_en, district: tenant.district, category: tenant.category, seedlings: r.rows });
      } catch (e) {
        results.push({ slug, name_bn: tenant.name_bn, error: e.message, seedlings: [] });
      }
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/superadmin/report/production-summary
router.get("/report/production-summary", saAuth, async (req, res) => {
  try {
    const { fy, center } = req.query;
    const tenants = await getTenants();
    const { getPool } = require("../config/poolManager");
    const results = [];
    const fyYear = parseInt(fy) || new Date().getFullYear();
    const startDate = `${fyYear}-07-01`;
    const endDate = `${fyYear + 1}-06-30`;
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      if (center && slug !== center) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const r = await db.query(`
          SELECT c.name_bn AS category_bn, s.name_bn, s.variety,
            COALESCE(SUM(pb.produced_quantity), 0) AS total_produced,
            COALESCE(SUM(pb.failed_quantity), 0) AS total_failed,
            s.current_stock
          FROM seedlings s
          LEFT JOIN categories c ON s.category_id = c.id
          LEFT JOIN production_batches pb ON pb.seedling_id = s.id AND pb.batch_date BETWEEN $1 AND $2
          WHERE s.is_active = true
          GROUP BY c.name_bn, s.name_bn, s.variety, s.current_stock
          ORDER BY c.name_bn, s.name_bn
        `, [startDate, endDate]);
        results.push({ slug, name_bn: tenant.name_bn, district: tenant.district, data: r.rows });
      } catch (e) {
        results.push({ slug, name_bn: tenant.name_bn, error: e.message, data: [] });
      }
    }
    res.json({ success: true, data: results, fy: fyYear });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

router.post("/center/:slug/set-target", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    const tenant = tenants[req.params.slug];
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "সেন্টার পাওয়া যায়নি।" });

    const {
      target_type,
      target_month,
      target_year,
      target_quantity,
      target_amount,
      notes,
    } = req.body;

    if (!target_type || !target_year)
      return res
        .status(400)
        .json({ success: false, message: "লক্ষ্যমাত্রার ধরন ও বছর দিন।" });

    const month = target_month || 0;

    // আগে দেখো এই target আছে কিনা
    const existing = await queryTenant(
      tenant.db_url,
      `SELECT id FROM targets WHERE target_type=$1 AND target_year=$2 AND target_month=$3 LIMIT 1`,
      [target_type, target_year, month],
    );

    if (existing.length > 0) {
      // থাকলে update
      await queryTenant(
        tenant.db_url,
        `UPDATE targets SET target_quantity=$1, target_amount=$2, notes=$3
 WHERE target_type=$4 AND target_year=$5 AND target_month=$6`,
        [
          target_quantity || 0,
          target_amount || 0,
          notes || "",
          target_type,
          target_year,
          month,
        ],
      );
    } else {
      // না থাকলে insert
      await queryTenant(
        tenant.db_url,
        `INSERT INTO targets (target_type, target_month, target_year, target_quantity, target_amount, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          target_type,
          month,
          target_year,
          target_quantity || 0,
          target_amount || 0,
          notes || "",
        ],
      );
    }

    res.json({
      success: true,
      message: `${tenant.name_bn || req.params.slug}-এর লক্ষ্যমাত্রা নির্ধারণ হয়েছে ✅`,
    });
  } catch (err) {
    console.error("set-target error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Notice Board
router.get("/notices", saAuth, async (req, res) => {
  try {
    const r = await masterDb.query(
      `SELECT * FROM notices WHERE is_active=true ORDER BY created_at DESC LIMIT 50`,
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/notices", saAuth, async (req, res) => {
  try {
    const { title, content, priority, expires_at } = req.body;
    if (!title || !content)
      return res
        .status(400)
        .json({ success: false, message: "শিরোনাম ও বিষয়বস্তু দিন।" });
    const r = await masterDb.query(
      `INSERT INTO notices (title, content, priority, created_by, expires_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        title,
        content,
        priority || "normal",
        req.saUser?.email || "director",
        expires_at || null,
      ],
    );
    res.json({
      success: true,
      message: "নোটিশ প্রকাশিত হয়েছে ✅",
      data: r.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/notices/:id", saAuth, async (req, res) => {
  try {
    await masterDb.query(`UPDATE notices SET is_active=false WHERE id=$1`, [
      req.params.id,
    ]);
    res.json({ success: true, message: "নোটিশ মুছে ফেলা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// end of notice board routes


// ── CENTER APP USER MANAGEMENT ──

// GET /api/superadmin/center-users
router.get("/center-users", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    const { getPool } = require("../config/poolManager");
    const results = [];
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const r = await db.query(
          "SELECT id, name, email, role, is_active, created_at FROM users WHERE role='admin' ORDER BY created_at DESC"
        );
        r.rows.forEach(u => results.push({ ...u, center_slug: slug, center_name: tenant.name_bn }));
      } catch (e) {}
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/superadmin/center-users
router.post("/center-users", saAuth, directorOnly, async (req, res) => {
  const { center_slug, name, email, password, role } = req.body;
  if (!center_slug || !name || !email || !password || !role)
    return res.status(400).json({ success: false, message: "সব তথ্য দিন।" });
  try {
    const tenants = await getTenants();
    const tenant = tenants[center_slug];
    if (!tenant) return res.status(404).json({ success: false, message: "Center পাওয়া যায়নি।" });
    const { getPool } = require("../config/poolManager");
    const bcrypt = require("bcryptjs");
    const db = getPool(tenant.db_url, center_slug);
    const exists = await db.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length)
      return res.status(400).json({ success: false, message: "এই email আগে থেকে আছে।" });
    const hash = await bcrypt.hash(password, 10);
    const r = await db.query(
      "INSERT INTO users (name, email, password, role, is_active) VALUES ($1,$2,$3,$4,true) RETURNING id, name, email, role",
      [name, email, hash, role]
    );
    res.json({ success: true, message: `"${name}" তৈরি হয়েছে।`, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/superadmin/center-users/:slug/:id
router.put("/center-users/:slug/:id", saAuth, directorOnly, async (req, res) => {
  const { slug, id } = req.params;
  const { name, email, role, password } = req.body;
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "Center পাওয়া যায়নি।" });
    const { getPool } = require("../config/poolManager");
    const bcrypt = require("bcryptjs");
    const db = getPool(tenant.db_url, slug);
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query("UPDATE users SET name=$1, email=$2, role=$3, password=$4 WHERE id=$5", [name, email, role, hash, id]);
    } else {
      await db.query("UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4", [name, email, role, id]);
    }
    res.json({ success: true, message: "আপডেট হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/superadmin/center-users/:slug/:id/toggle
router.post("/center-users/:slug/:id/toggle", saAuth, directorOnly, async (req, res) => {
  const { slug, id } = req.params;
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "Center পাওয়া যায়নি।" });
    const { getPool } = require("../config/poolManager");
    const db = getPool(tenant.db_url, slug);
    const cur = await db.query("SELECT is_active FROM users WHERE id=$1", [id]);
    if (!cur.rows.length) return res.status(404).json({ success: false, message: "User পাওয়া যায়নি।" });
    const newStatus = !cur.rows[0].is_active;
    await db.query("UPDATE users SET is_active=$1 WHERE id=$2", [newStatus, id]);
    res.json({ success: true, message: newStatus ? "সক্রিয় করা হয়েছে।" : "বন্ধ করা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/superadmin/center-users/:slug/:id/reset-password
router.post("/center-users/:slug/:id/reset-password", saAuth, directorOnly, async (req, res) => {
  const { slug, id } = req.params;
  const { new_password } = req.body;
  if (!new_password) return res.status(400).json({ success: false, message: "নতুন password দিন।" });
  try {
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.status(404).json({ success: false, message: "Center পাওয়া যায়নি।" });
    const { getPool } = require("../config/poolManager");
    const bcrypt = require("bcryptjs");
    const db = getPool(tenant.db_url, slug);
    const hash = await bcrypt.hash(new_password, 10);
    await db.query("UPDATE users SET password=$1 WHERE id=$2", [hash, id]);
    res.json({ success: true, message: "Password reset হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── REPORT ROUTES ──

// GET /api/superadmin/report/stock-summary
router.get("/report/stock-summary", saAuth, async (req, res) => {
  try {
    const { category } = req.query;
    const tenants = await getTenants();
    const { getPool } = require("../config/poolManager");
    const results = [];
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        let q = `SELECT s.name_bn, s.variety, s.unit_price, s.current_stock, s.seedling_code, c.name_bn AS category_bn FROM seedlings s LEFT JOIN categories c ON s.category_id = c.id WHERE s.is_active = true`;
        const params = [];
        if (category) { params.push(category); q += ` AND c.name_bn = $${params.length}`; }
        q += ` ORDER BY c.name_bn, s.name_bn, s.variety`;
        const r = await db.query(q, params);
        results.push({ slug, name_bn: tenant.name_bn, name_en: tenant.name_en, district: tenant.district, category: tenant.category, seedlings: r.rows });
      } catch (e) {
        results.push({ slug, name_bn: tenant.name_bn, error: e.message, seedlings: [] });
      }
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/superadmin/report/production-summary
router.get("/report/production-summary", saAuth, async (req, res) => {
  try {
    const { fy, center } = req.query;
    const tenants = await getTenants();
    const { getPool } = require("../config/poolManager");
    const results = [];
    const fyYear = parseInt(fy) || new Date().getFullYear();
    const startDate = `${fyYear}-07-01`;
    const endDate = `${fyYear + 1}-06-30`;
    for (const [slug, tenant] of Object.entries(tenants)) {
      if (!tenant.active || !tenant.db_url) continue;
      if (center && slug !== center) continue;
      try {
        const db = getPool(tenant.db_url, slug);
        const r = await db.query(`
          SELECT c.name_bn AS category_bn, s.name_bn, s.variety,
            COALESCE(SUM(pb.produced_quantity), 0) AS total_produced,
            COALESCE(SUM(pb.failed_quantity), 0) AS total_failed,
            s.current_stock
          FROM seedlings s
          LEFT JOIN categories c ON s.category_id = c.id
          LEFT JOIN production_batches pb ON pb.seedling_id = s.id AND pb.batch_date BETWEEN $1 AND $2
          WHERE s.is_active = true
          GROUP BY c.name_bn, s.name_bn, s.variety, s.current_stock
          ORDER BY c.name_bn, s.name_bn
        `, [startDate, endDate]);
        results.push({ slug, name_bn: tenant.name_bn, district: tenant.district, data: r.rows });
      } catch (e) {
        results.push({ slug, name_bn: tenant.name_bn, error: e.message, data: [] });
      }
    }
    res.json({ success: true, data: results, fy: fyYear });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
