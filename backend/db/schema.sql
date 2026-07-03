-- ============================================================
-- HORTICULTURE CENTER - ASAMBASTI, RANGAMATI
-- PostgreSQL Database Schema
-- Version: 1.0
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(30) NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin','manager','production_officer','sales_operator','viewer')),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name_bn     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO categories (name_bn, name_en) VALUES
('ফল',        'Fruit'),
('কাঠ',       'Timber'),
('ঔষধি',      'Medicinal'),
('অলংকারী',   'Ornamental'),
('ফুল',       'Flower');

-- ============================================================
-- 3. SEEDLINGS TABLE
-- ============================================================
CREATE TABLE seedlings (
    id               SERIAL PRIMARY KEY,
    seedling_code    VARCHAR(20) UNIQUE NOT NULL,
    name_bn          VARCHAR(150) NOT NULL,
    name_en          VARCHAR(150),
    variety          VARCHAR(150),
    category_id      INTEGER REFERENCES categories(id),
    production_type  VARCHAR(30) NOT NULL
                     CHECK (production_type IN ('seed','grafting','cutting','budding','layering','tissue_culture')),
    unit_price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    production_cost  NUMERIC(10,2) DEFAULT 0,
    current_stock    INTEGER DEFAULT 0,
    min_stock_alert  INTEGER DEFAULT 20,
    description      TEXT,
    image_url        VARCHAR(255),
    is_active        BOOLEAN DEFAULT TRUE,
    created_by       INTEGER REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_seedlings_category ON seedlings(category_id);
CREATE INDEX idx_seedlings_type ON seedlings(production_type);

-- ============================================================
-- 4. MOTHER PLANTS TABLE
-- ============================================================
CREATE TABLE mother_plants (
    id              SERIAL PRIMARY KEY,
    mp_code         VARCHAR(20) UNIQUE NOT NULL,
    variety         VARCHAR(150) NOT NULL,
    seedling_id     INTEGER REFERENCES seedlings(id),
    age_years       INTEGER,
    location        VARCHAR(100),
    health_status   VARCHAR(20) DEFAULT 'good'
                    CHECK (health_status IN ('excellent','good','weak','dead')),
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 5. PRODUCTION BATCHES TABLE
-- ============================================================
CREATE TABLE production_batches (
    id                    SERIAL PRIMARY KEY,
    batch_code            VARCHAR(30) UNIQUE NOT NULL,
    seedling_id           INTEGER NOT NULL REFERENCES seedlings(id),
    production_type       VARCHAR(30) NOT NULL,

    -- Seed production fields
    seed_source           VARCHAR(150),
    seed_quantity         INTEGER,
    sowing_date           DATE,
    germination_date      DATE,
    germination_percent   NUMERIC(5,2),

    -- Asexual propagation fields
    mother_plant_id       INTEGER REFERENCES mother_plants(id),
    rootstock             VARCHAR(150),
    scion_variety         VARCHAR(150),
    propagation_date      DATE,

    -- Common fields
    produced_quantity     INTEGER NOT NULL DEFAULT 0,
    success_quantity      INTEGER DEFAULT 0,
    failed_quantity       INTEGER DEFAULT 0,
    success_percent       NUMERIC(5,2),
    available_quantity    INTEGER DEFAULT 0,
    remarks               TEXT,
    status                VARCHAR(20) DEFAULT 'active'
                          CHECK (status IN ('active','partial','sold_out','closed')),
    created_by            INTEGER REFERENCES users(id),
    created_at            TIMESTAMP DEFAULT NOW(),
    updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_batches_seedling ON production_batches(seedling_id);
CREATE INDEX idx_batches_status ON production_batches(status);
CREATE INDEX idx_batches_date ON production_batches(created_at);

-- ============================================================
-- 6. STOCK TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE stock_transactions (
    id              SERIAL PRIMARY KEY,
    seedling_id     INTEGER NOT NULL REFERENCES seedlings(id),
    batch_id        INTEGER REFERENCES production_batches(id),
    txn_type        VARCHAR(20) NOT NULL
                    CHECK (txn_type IN ('production','sale','damage','adjustment','distribution','opening')),
    quantity        INTEGER NOT NULL,
    direction       CHAR(1) NOT NULL CHECK (direction IN ('+','-')),
    balance_after   INTEGER NOT NULL,
    reference_id    INTEGER,
    reference_type  VARCHAR(30),
    notes           TEXT,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stock_seedling ON stock_transactions(seedling_id);
CREATE INDEX idx_stock_date ON stock_transactions(created_at);
CREATE INDEX idx_stock_type ON stock_transactions(txn_type);

-- ============================================================
-- 7. CUSTOMERS TABLE
-- ============================================================
CREATE TABLE customers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    phone       VARCHAR(20),
    address     TEXT,
    email       VARCHAR(150),
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================================
-- 8. SALES TABLE
-- ============================================================
CREATE TABLE sales (
    id              SERIAL PRIMARY KEY,
    invoice_no      VARCHAR(30) UNIQUE NOT NULL,
    customer_id     INTEGER REFERENCES customers(id),
    customer_name   VARCHAR(150),
    customer_phone  VARCHAR(20),
    customer_address TEXT,
    sale_date       DATE DEFAULT CURRENT_DATE,
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(10,2) DEFAULT 0,
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method  VARCHAR(20) DEFAULT 'cash'
                    CHECK (payment_method IN ('cash','bkash','bank','cheque','credit')),
    payment_status  VARCHAR(20) DEFAULT 'paid'
                    CHECK (payment_status IN ('paid','pending','partial')),
    notes           TEXT,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_invoice ON sales(invoice_no);
CREATE INDEX idx_sales_customer ON sales(customer_id);

-- ============================================================
-- 9. SALES ITEMS TABLE
-- ============================================================
CREATE TABLE sales_items (
    id          SERIAL PRIMARY KEY,
    sale_id     INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    seedling_id INTEGER NOT NULL REFERENCES seedlings(id),
    batch_id    INTEGER REFERENCES production_batches(id),
    quantity    INTEGER NOT NULL,
    unit_price  NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_items_sale ON sales_items(sale_id);
CREATE INDEX idx_sales_items_seedling ON sales_items(seedling_id);

-- ============================================================
-- 10. DAMAGES TABLE
-- ============================================================
CREATE TABLE damages (
    id          SERIAL PRIMARY KEY,
    seedling_id INTEGER NOT NULL REFERENCES seedlings(id),
    batch_id    INTEGER REFERENCES production_batches(id),
    damage_date DATE DEFAULT CURRENT_DATE,
    quantity    INTEGER NOT NULL,
    reason      VARCHAR(30) NOT NULL
                CHECK (reason IN ('disease','drought','flood','pest','cold','other')),
    remarks     TEXT,
    reported_by INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_damages_seedling ON damages(seedling_id);
CREATE INDEX idx_damages_date ON damages(damage_date);

-- ============================================================
-- 11. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    action      VARCHAR(50) NOT NULL,
    table_name  VARCHAR(50),
    record_id   INTEGER,
    old_data    JSONB,
    new_data    JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated       BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_seedlings_updated   BEFORE UPDATE ON seedlings       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_batches_updated     BEFORE UPDATE ON production_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sales_updated       BEFORE UPDATE ON sales           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated   BEFORE UPDATE ON customers       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_mother_updated      BEFORE UPDATE ON mother_plants   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto generate batch code
CREATE OR REPLACE FUNCTION generate_batch_code()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(batch_code FROM 10) AS INTEGER)), 0) + 1
    INTO next_num
    FROM production_batches
    WHERE batch_code LIKE 'B-' || TO_CHAR(NOW(), 'YYYY') || '-%';

    NEW.batch_code := 'B-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_batch_code
    BEFORE INSERT ON production_batches
    FOR EACH ROW
    WHEN (NEW.batch_code IS NULL OR NEW.batch_code = '')
    EXECUTE FUNCTION generate_batch_code();

-- Auto generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_no()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_no FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM sales;
    NEW.invoice_no := 'INV-' || LPAD(next_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_no
    BEFORE INSERT ON sales
    FOR EACH ROW
    WHEN (NEW.invoice_no IS NULL OR NEW.invoice_no = '')
    EXECUTE FUNCTION generate_invoice_no();

-- ============================================================
-- STOCK CALCULATION VIEW
-- ============================================================
CREATE VIEW stock_summary AS
SELECT
    s.id,
    s.seedling_code,
    s.name_bn,
    s.name_en,
    s.variety,
    c.name_bn AS category_bn,
    s.production_type,
    s.unit_price,
    COALESCE(SUM(CASE WHEN st.direction = '+' THEN st.quantity ELSE 0 END), 0) AS total_in,
    COALESCE(SUM(CASE WHEN st.direction = '-' THEN st.quantity ELSE 0 END), 0) AS total_out,
    COALESCE(SUM(CASE WHEN st.direction = '+' THEN st.quantity ELSE -st.quantity END), 0) AS current_stock,
    s.min_stock_alert,
    CASE WHEN COALESCE(SUM(CASE WHEN st.direction='+' THEN st.quantity ELSE -st.quantity END),0) <= s.min_stock_alert
         THEN TRUE ELSE FALSE END AS is_low_stock
FROM seedlings s
LEFT JOIN categories c ON s.category_id = c.id
LEFT JOIN stock_transactions st ON s.id = st.seedling_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.seedling_code, s.name_bn, s.name_en, s.variety,
         c.name_bn, s.production_type, s.unit_price, s.min_stock_alert;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Default admin user (password: Admin@1234)
INSERT INTO users (name, email, password, role) VALUES
('Md. Amin',       'amin@horticulture.bd',   '$2b$10$examplehashforamin',   'admin'),
('Salma Khatun',   'salma@horticulture.bd',  '$2b$10$examplehashforsalma',  'sales_operator'),
('Karim Hossain',  'karim@horticulture.bd',  '$2b$10$examplehashforkarim',  'production_officer'),
('Rahim Babu',     'rahim@horticulture.bd',  '$2b$10$examplehashforrahim',  'production_officer'),
('Nuri Begum',     'nuri@horticulture.bd',   '$2b$10$examplehashfornuri',   'viewer');

-- Sample seedlings
INSERT INTO seedlings (seedling_code, name_bn, name_en, variety, category_id, production_type, unit_price, production_cost, min_stock_alert) VALUES
('SL-001', 'আম',       'Mango',     'আম্রপালি',   1, 'grafting',  120, 45, 20),
('SL-002', 'নিম',      'Neem',      'দেশীয়',     2, 'seed',       35, 15, 50),
('SL-003', 'লেবু',     'Lemon',     'এলাচি',      1, 'cutting',    80, 30, 20),
('SL-004', 'মেহগনি',   'Mahogany',  'সুইটেনিয়া',  2, 'seed',       45, 18, 50),
('SL-005', 'কাঁঠাল',   'Jackfruit', 'খাজা',       1, 'seed',       60, 22, 30),
('SL-006', 'গোলাপ',    'Rose',      'লাল হাইব্রিড',5,'cutting',    55, 20, 25);

-- Sample mother plants
INSERT INTO mother_plants (mp_code, variety, seedling_id, age_years, location, health_status) VALUES
('MP-012', 'আম আম্রপালি',     1, 12, 'ব্লক-এ সারি ৩', 'excellent'),
('MP-007', 'লেবু এলাচি',      3,  8, 'ব্লক-বি সারি ১', 'good'),
('MP-021', 'গোলাপ লাল হাইব্রিড', 6, 5, 'ব্লক-সি সারি ৭', 'excellent');

-- Sample customer
INSERT INTO customers (name, phone, address) VALUES
('রহিম নার্সারিজ',    '01712345678', 'চট্টগ্রাম'),
('বন বিভাগ বাংলাদেশ', '02-9999000',  'ঢাকা'),
('কামাল আহমেদ',       '01911234567', 'রাঙামাটি');
