-- HortNet-BD tenant schema — v1-এর সাথে হুবহু মিলিয়ে (কোনো ফিচার বাদ নেই)
-- v1: categories, users, seedlings, mother_plants, production_batches,
--     stock_transactions, customers, sales, sales_items, damages, audit_logs,
--     targets, other_income, recycle_bin + stock_summary view

CREATE TABLE IF NOT EXISTS categories (
  id                  SERIAL PRIMARY KEY,
  name_bn             VARCHAR(100) NOT NULL,
  name_en             VARCHAR(100) NOT NULL,
  description         TEXT,
  category_master_id  INTEGER,
  base_group          VARCHAR(50),
  created_at          TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id                      SERIAL PRIMARY KEY,
  name                    VARCHAR(100) NOT NULL,
  email                   VARCHAR(150) NOT NULL UNIQUE,
  password                VARCHAR(255) NOT NULL,
  role                    VARCHAR(30)  NOT NULL DEFAULT 'viewer',
  is_active               BOOLEAN DEFAULT true,
  pending_password        TEXT,
  password_request_status TEXT,
  created_at              TIMESTAMP DEFAULT now(),
  updated_at              TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seedlings (
  id              SERIAL PRIMARY KEY,
  seedling_code   VARCHAR(20)  NOT NULL,
  name_bn         VARCHAR(150) NOT NULL,
  name_en         VARCHAR(150),
  variety         VARCHAR(150),
  category_id     INTEGER REFERENCES categories(id),
  production_type VARCHAR(30)  NOT NULL,
  unit_price      NUMERIC NOT NULL DEFAULT 0,
  production_cost NUMERIC DEFAULT 0,
  current_stock   INTEGER DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 20,
  description     TEXT,
  image_url       VARCHAR(255),
  is_active       BOOLEAN DEFAULT true,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mother_plants (
  id            SERIAL PRIMARY KEY,
  mp_code       VARCHAR(20)  NOT NULL,
  variety       VARCHAR(150) NOT NULL,
  seedling_id   INTEGER REFERENCES seedlings(id),
  quantity      INTEGER DEFAULT 1,
  age_years     INTEGER,
  location      VARCHAR(100),
  health_status VARCHAR(20) DEFAULT 'good',
  notes         TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT now(),
  updated_at    TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_batches (
  id                  SERIAL PRIMARY KEY,
  batch_code          VARCHAR(30) NOT NULL,
  seedling_id         INTEGER NOT NULL REFERENCES seedlings(id),
  production_type     VARCHAR(30) NOT NULL,
  seed_source         VARCHAR(150),
  seed_quantity       INTEGER,
  sowing_date         DATE,
  germination_date    DATE,
  germination_percent NUMERIC,
  mother_plant_id     INTEGER REFERENCES mother_plants(id),
  rootstock           VARCHAR(150),
  scion_variety       VARCHAR(150),
  propagation_date    DATE,
  produced_quantity   INTEGER NOT NULL DEFAULT 0,
  success_quantity    INTEGER DEFAULT 0,
  failed_quantity     INTEGER DEFAULT 0,
  success_percent     NUMERIC,
  available_quantity  INTEGER DEFAULT 0,
  remarks             TEXT,
  status              VARCHAR(20) DEFAULT 'active',
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT now(),
  updated_at          TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id             SERIAL PRIMARY KEY,
  seedling_id    INTEGER NOT NULL REFERENCES seedlings(id),
  batch_id       INTEGER REFERENCES production_batches(id),
  txn_type       VARCHAR(20) NOT NULL,
  quantity       INTEGER NOT NULL,
  direction      CHAR(1) NOT NULL,           -- v1-এর মতো '+' / '-'
  balance_after  INTEGER NOT NULL,
  reference_id   INTEGER,
  reference_type VARCHAR(30),
  notes          TEXT,
  created_by     INTEGER REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  phone      VARCHAR(20),
  address    TEXT,
  email      VARCHAR(150),
  notes      TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id               SERIAL PRIMARY KEY,
  invoice_no       VARCHAR(30) NOT NULL,
  customer_id      INTEGER REFERENCES customers(id),
  customer_name    VARCHAR(150),
  customer_phone   VARCHAR(20),
  customer_address TEXT,
  sale_date        DATE DEFAULT CURRENT_DATE,
  subtotal         NUMERIC NOT NULL DEFAULT 0,
  discount         NUMERIC DEFAULT 0,
  total_amount     NUMERIC NOT NULL DEFAULT 0,
  payment_method   VARCHAR(20) DEFAULT 'cash',
  payment_status   VARCHAR(20) DEFAULT 'paid',
  notes            TEXT,
  created_by       INTEGER REFERENCES users(id),
  created_at       TIMESTAMP DEFAULT now(),
  updated_at       TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_items (
  id          SERIAL PRIMARY KEY,
  sale_id     INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  seedling_id INTEGER NOT NULL REFERENCES seedlings(id),
  batch_id    INTEGER REFERENCES production_batches(id),
  quantity    INTEGER NOT NULL,
  unit_price  NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS damages (
  id          SERIAL PRIMARY KEY,
  seedling_id INTEGER NOT NULL REFERENCES seedlings(id),
  batch_id    INTEGER REFERENCES production_batches(id),
  damage_date DATE DEFAULT CURRENT_DATE,
  quantity    INTEGER NOT NULL,
  reason      VARCHAR(30) NOT NULL,
  remarks     TEXT,
  reported_by INTEGER REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  action     VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id  INTEGER,
  old_data   JSONB,
  new_data   JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS targets (
  id              SERIAL PRIMARY KEY,
  target_type     TEXT NOT NULL,
  target_month    INTEGER NOT NULL,
  target_year     INTEGER NOT NULL,
  target_quantity INTEGER DEFAULT 0,
  target_amount   NUMERIC DEFAULT 0,
  remarks         TEXT,
  notes           TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS other_income (
  id          SERIAL PRIMARY KEY,
  income_type TEXT NOT NULL,
  category    TEXT,
  amount      NUMERIC NOT NULL DEFAULT 0,
  income_date DATE NOT NULL,
  description TEXT,
  created_by  INTEGER REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT now(),
  quantity          NUMERIC,
  unit_price        NUMERIC,
  produce_price_id  INTEGER,
  room_category_id  INTEGER,
  check_in          DATE,
  check_out         DATE,
  guest_name        VARCHAR(200),
  guest_mobile      VARCHAR(20),
  guest_occupation  VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS recycle_bin (
  id          SERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   INTEGER NOT NULL,
  record_data JSONB NOT NULL,
  module      TEXT NOT NULL,
  item_name   TEXT,
  deleted_by  INTEGER REFERENCES users(id),
  deleted_at  TIMESTAMP DEFAULT now()
);

CREATE OR REPLACE VIEW stock_summary AS
SELECT
  s.id, s.name_bn, s.variety, s.seedling_code, s.unit_price, s.current_stock,
  c.name_bn AS category_bn,
  COALESCE(SUM(CASE WHEN st.direction = '+' THEN st.quantity ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE WHEN st.txn_type = 'sale' THEN st.quantity ELSE 0 END), 0) AS total_sale,
  COALESCE(SUM(CASE WHEN st.txn_type = 'damage' THEN st.quantity ELSE 0 END), 0) AS total_damage,
  COALESCE(SUM(CASE WHEN st.direction = '-' THEN st.quantity ELSE 0 END), 0) AS total_out
FROM seedlings s
LEFT JOIN categories c ON s.category_id = c.id
LEFT JOIN stock_transactions st ON s.id = st.seedling_id
GROUP BY s.id, s.name_bn, s.variety, s.seedling_code, s.unit_price, s.current_stock, c.name_bn;
-- ===== AUTO-GENERATE TRIGGERS =====

-- Batch code auto-generate
CREATE OR REPLACE FUNCTION generate_batch_code()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num  INT;
  new_code TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num 
  FROM production_batches 
  WHERE batch_code LIKE 'B-' || year_str || '-%';
  new_code := 'B-' || year_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  NEW.batch_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_batch_code ON production_batches;
CREATE TRIGGER set_batch_code
BEFORE INSERT ON production_batches
FOR EACH ROW
WHEN (NEW.batch_code IS NULL OR NEW.batch_code = '')
EXECUTE FUNCTION generate_batch_code();

-- Invoice number auto-generate
CREATE OR REPLACE FUNCTION generate_invoice_no()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INT;
  new_inv TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM sales;
  new_inv := 'INV-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.invoice_no := new_inv;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_no ON sales;
CREATE TRIGGER set_invoice_no
BEFORE INSERT ON sales
FOR EACH ROW
WHEN (NEW.invoice_no IS NULL OR NEW.invoice_no = '')
EXECUTE FUNCTION generate_invoice_no();


CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name_bn VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  designation VARCHAR(200),
  staff_type VARCHAR(20) DEFAULT 'permanent',
  worker_type VARCHAR(50),
  posting_type VARCHAR(20) DEFAULT 'regular',
  charge_type VARCHAR(20),
  charge_designation VARCHAR(200),
  employee_id VARCHAR(50),
  grade VARCHAR(20),
  prl_date DATE,
  gender VARCHAR(10),
  join_date DATE,
  nid VARCHAR(50),
  mobile VARCHAR(20),
  address TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produce_prices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  unit VARCHAR(50),
  price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  daily_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);