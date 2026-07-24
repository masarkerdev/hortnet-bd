// lib/statsCache.js
// ৭৬+ center-এ স্কেল করার জন্য — সব center-এর KPI background-এ periodically
// cache table-এ সংরক্ষণ করে রাখে, যাতে Overview page instant load হয়
// (live query না করে cache থেকে পড়ে)

const masterDb = require("../config/masterDb");
const { getTenants } = require("./tenantCache");
const { getPool } = require("../config/poolManager");

let isRefreshing = false;

async function ensureCacheTable() {
  await masterDb.query(`
    CREATE TABLE IF NOT EXISTS center_stats_cache (
      slug VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

async function fetchOneTenantStats(slug, tenant) {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  const fyStart = curMonth >= 7 ? curYear : curYear - 1;
  const db = getPool(tenant.db_url, slug);

  const [
    sales, todaySales, currentMonth, lastMonth, monthlyTarget,
    production, stock, lowStock, annualProdTarget, monthlyProdTarget,
    monthlyProdAchieved, otherIncomeTotal, annualProdAchieved,
  ] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(total_amount),0) AS total_revenue, COUNT(*) AS total_invoices FROM sales`),
    db.query(`SELECT COALESCE(SUM(total_amount),0) AS today_revenue FROM sales WHERE sale_date=CURRENT_DATE`),
    db.query(`SELECT COALESCE(SUM(total_amount),0) AS revenue FROM sales WHERE EXTRACT(MONTH FROM sale_date)=EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM sale_date)=EXTRACT(YEAR FROM NOW())`),
    db.query(`SELECT COALESCE(SUM(total_amount),0) AS revenue FROM sales WHERE EXTRACT(MONTH FROM sale_date)=EXTRACT(MONTH FROM NOW()-INTERVAL '1 month') AND EXTRACT(YEAR FROM sale_date)=EXTRACT(YEAR FROM (NOW()-INTERVAL '1 month'))`),
    db.query(`SELECT COALESCE(target_amount,0) AS target_amount FROM targets WHERE target_type='sales' AND target_month=EXTRACT(MONTH FROM NOW()) AND target_year=EXTRACT(YEAR FROM NOW()) LIMIT 1`),
    db.query(`SELECT COUNT(*) AS total_batches, COALESCE(SUM(CASE WHEN production_type='seed' THEN produced_quantity ELSE COALESCE(success_quantity,produced_quantity) END),0) AS total_produced, COALESCE(AVG(CASE WHEN success_percent>0 THEN success_percent END),0) AS avg_success, COALESCE(SUM(available_quantity),0) AS total_available FROM production_batches`),
    db.query(`SELECT COALESCE(SUM(current_stock),0) AS total_stock, COALESCE(SUM(current_stock*unit_price),0) AS stock_value, COUNT(*) AS total_species FROM seedlings WHERE is_active=true`),
    db.query(`SELECT COUNT(*) AS low_count FROM seedlings WHERE is_active=true AND current_stock<=min_stock_alert`),
    db.query(`SELECT COALESCE(SUM(target_quantity),0) AS qty FROM targets WHERE target_type LIKE 'category_%' AND target_month=0 AND target_year=$1`, [fyStart]),
    db.query(`SELECT COALESCE(ROUND(SUM(target_quantity)/12.0),0) AS qty FROM targets WHERE target_type LIKE 'category_%' AND target_month=0 AND target_year=$1`, [fyStart]),
    db.query(`SELECT COALESCE(SUM(CASE WHEN production_type='seed' THEN produced_quantity ELSE COALESCE(success_quantity,produced_quantity) END),0) AS qty FROM production_batches WHERE EXTRACT(MONTH FROM COALESCE(sowing_date,propagation_date))=$1 AND EXTRACT(YEAR FROM COALESCE(sowing_date,propagation_date))=$2`, [curMonth, curYear]),
    db.query(`SELECT COALESCE(SUM(amount),0) AS total FROM other_income`),
    // চলতি অর্থবছরের (জুলাই-জুন) মোট উৎপাদন — শুধু এই অর্থবছরের data, all-time না
    db.query(`SELECT COALESCE(SUM(CASE WHEN production_type='seed' THEN produced_quantity ELSE COALESCE(success_quantity,produced_quantity) END),0) AS qty FROM production_batches WHERE COALESCE(sowing_date,propagation_date) >= $1 AND COALESCE(sowing_date,propagation_date) <= $2`, [`${fyStart}-07-01`, `${fyStart + 1}-06-30`]),
  ]);

  const curRev = parseFloat(currentMonth.rows[0].revenue);
  const lastRev = parseFloat(lastMonth.rows[0].revenue);
  const growthRate = lastRev > 0 ? ((curRev - lastRev) / lastRev) * 100 : curRev > 0 ? 100 : 0;
  const targetAmt = parseFloat(monthlyTarget.rows[0]?.target_amount || 0);
  const lowCount = parseInt(lowStock.rows[0].low_count);
  const totalSpecies = parseInt(stock.rows[0].total_species) || 1;
  const stockHealth = Math.max(0, 100 - (lowCount / totalSpecies) * 100);
  const successRate = parseFloat(production.rows[0].avg_success) || 0;
  const revPerBatch = parseFloat(sales.rows[0].total_revenue) / (parseInt(production.rows[0].total_batches) || 1);
  const perfScore = Math.round((successRate + stockHealth + Math.min(growthRate + 50, 100)) / 3);

  return {
    slug,
    name_en: tenant.name_en,
    name_bn: tenant.name_bn,
    category: tenant.category,
    district: tenant.district,
    division: tenant.division,
    total_revenue: parseFloat(sales.rows[0].total_revenue),
    total_invoices: parseInt(sales.rows[0].total_invoices),
    today_revenue: parseFloat(todaySales.rows[0].today_revenue),
    total_produced: parseInt(production.rows[0].total_produced),
    total_stock: parseInt(stock.rows[0].total_stock),
    stock_value: parseFloat(stock.rows[0].stock_value),
    current_month_rev: curRev,
    last_month_rev: lastRev,
    growth_rate: parseFloat(growthRate.toFixed(1)),
    target_amount: targetAmt,
    avg_success: parseFloat(successRate.toFixed(1)),
    low_stock_count: lowCount,
    total_species: parseInt(stock.rows[0].total_species),
    stock_health: parseFloat(stockHealth.toFixed(1)),
    rev_per_batch: parseFloat(revPerBatch.toFixed(0)) || 0,
    perf_score: perfScore,
    traffic_light: perfScore >= 70 ? "green" : perfScore >= 45 ? "yellow" : "red",
    annual_prod_target: parseInt(annualProdTarget.rows[0]?.qty || 0),
    monthly_prod_target: parseInt(monthlyProdTarget.rows[0]?.qty || 0),
    other_income_total: parseFloat(otherIncomeTotal.rows[0]?.total || 0),
    monthly_prod_achieved: parseInt(monthlyProdAchieved.rows[0]?.qty || 0),
    annual_prod_achieved: parseInt(annualProdAchieved.rows[0]?.qty || 0),
    status: "ok",
  };
}

// ব্যাচ করে সব center refresh করে (একসাথে সবগুলো না — connection surge এড়াতে)
async function refreshAllStats() {
  if (isRefreshing) return; // একই সময়ে দুটো refresh একসাথে না চলুক
  isRefreshing = true;
  try {
    await ensureCacheTable();
    const tenants = await getTenants();
    const entries = Object.entries(tenants).filter(([, t]) => t.active && t.db_url);
    const BATCH_SIZE = 5;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ([slug, tenant]) => {
          try {
            const data = await fetchOneTenantStats(slug, tenant);
            await masterDb.query(
              `INSERT INTO center_stats_cache (slug, data, updated_at) VALUES ($1,$2,now())
               ON CONFLICT (slug) DO UPDATE SET data=$2, updated_at=now()`,
              [slug, JSON.stringify(data)]
            );
          } catch (e) {
            console.error(`[statsCache] ${slug} refresh failed:`, e.message);
          }
        })
      );
    }
    console.log(`[statsCache] Refreshed ${entries.length} centers.`);
  } catch (e) {
    console.error("[statsCache] refreshAllStats error:", e.message);
  } finally {
    isRefreshing = false;
  }
}

async function getCachedStats() {
  await ensureCacheTable();
  const r = await masterDb.query("SELECT data FROM center_stats_cache ORDER BY slug");
  return r.rows.map((row) => row.data);
}

// প্রতি ২ মিনিটে automatic background refresh শুরু করে (server চালু হলে)
function startBackgroundRefresh() {
  refreshAllStats(); // server চালু হওয়ার সাথে সাথেই একবার
  setInterval(refreshAllStats, 30 * 1000); // প্রতি ৩০ সেকেন্ডে (near real-time)
}

module.exports = { refreshAllStats, getCachedStats, startBackgroundRefresh };
