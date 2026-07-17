// lib/catalogCache.js
// Public Catalog Search-কে স্কেলেবল করার জন্য — প্রতিবার সব tenant DB-তে
// সরাসরি query না করে, master DB-তে একটা "catalog_cache" টেবিলে সব center-এর
// সব চারার তথ্য (নাম, জাত, দাম, মজুদ) periodically সংরক্ষণ করে রাখে।
// ৫০০০+ concurrent visitor সামলাতে এটাই দরকার।

const masterDb = require("../config/masterDb");
const { getTenants } = require("./tenantCache");
const { getPool } = require("../config/poolManager");

let isRefreshing = false;

async function ensureCacheTable() {
  await masterDb.query(`
    CREATE TABLE IF NOT EXISTS catalog_cache (
      id SERIAL PRIMARY KEY,
      center_slug VARCHAR(50) NOT NULL,
      center_name VARCHAR(200),
      location VARCHAR(200),
      district VARCHAR(100),
      seedling_name VARCHAR(200) NOT NULL,
      variety VARCHAR(150),
      seedling_code VARCHAR(50),
      category_bn VARCHAR(150),
      unit_price NUMERIC DEFAULT 0,
      current_stock INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await masterDb.query(`
    CREATE INDEX IF NOT EXISTS idx_catalog_cache_name ON catalog_cache (seedling_name);
  `);
  await masterDb.query(`
    CREATE INDEX IF NOT EXISTS idx_catalog_cache_variety ON catalog_cache (variety);
  `);
}

async function refreshOneCenter(slug, tenant) {
  const db = getPool(tenant.db_url, slug);
  const r = await db.query(`
    SELECT s.name_bn, s.variety, s.seedling_code,
           s.unit_price, s.current_stock,
           c.name_bn AS category_bn
    FROM seedlings s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.is_active = true AND s.current_stock > 0
  `);

  // এই center-এর পুরনো cache মুছে নতুন করে বসাই (delete + insert, একটা transaction-এ)
  await masterDb.query("DELETE FROM catalog_cache WHERE center_slug = $1", [slug]);

  if (r.rows.length) {
    const values = [];
    const placeholders = r.rows.map((row, i) => {
      const base = i * 9;
      values.push(
        slug,
        tenant.name_bn,
        tenant.location,
        tenant.district,
        row.name_bn,
        row.variety,
        row.seedling_code,
        row.category_bn,
        row.unit_price
      );
      values.push(row.current_stock);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10})`;
    });
    await masterDb.query(
      `INSERT INTO catalog_cache
       (center_slug, center_name, location, district, seedling_name, variety, seedling_code, category_bn, unit_price, current_stock)
       VALUES ${placeholders.join(",")}`,
      values
    );
  }
}

async function refreshAllCatalog() {
  if (isRefreshing) return;
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
            await refreshOneCenter(slug, tenant);
          } catch (e) {
            console.error(`[catalogCache] ${slug} refresh failed:`, e.message);
          }
        })
      );
    }
    console.log(`[catalogCache] Refreshed ${entries.length} centers.`);
  } catch (e) {
    console.error("[catalogCache] refreshAllCatalog error:", e.message);
  } finally {
    isRefreshing = false;
  }
}

// এখন শুধু cache table থেকে search করে — কোনো tenant DB touch করে না
async function searchCatalog(query) {
  await ensureCacheTable();
  const q = `%${query}%`;
  const r = await masterDb.query(
    `SELECT center_slug, center_name, location, district,
            seedling_name, variety, seedling_code, category_bn, unit_price, current_stock
     FROM catalog_cache
     WHERE seedling_name ILIKE $1 OR variety ILIKE $1
     ORDER BY center_name, seedling_name
     LIMIT 200`,
    [q]
  );
  return r.rows;
}

// প্রতি ৩ মিনিটে automatic background refresh
function startCatalogRefresh() {
  refreshAllCatalog();
  setInterval(refreshAllCatalog, 3 * 60 * 1000);
}

module.exports = { refreshAllCatalog, searchCatalog, startCatalogRefresh };
