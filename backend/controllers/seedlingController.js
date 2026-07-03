const db = require('../config/db');

// সকল চারা দেখুন (ফিল্টার সহ)
const getAllSeedlings = async (req, res) => {
    const { category_id, production_type, search, low_stock, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ['s.is_active = TRUE'];

    if (category_id) {
        params.push(category_id);
        conditions.push(`s.category_id = $${params.length}`);
    }
    if (production_type) {
        params.push(production_type);
        conditions.push(`s.production_type = $${params.length}`);
    }
    if (search) {
        params.push(`%${search}%`);
        conditions.push(`(s.name_bn ILIKE $${params.length} OR s.name_en ILIKE $${params.length} OR s.variety ILIKE $${params.length})`);
    }
    if (low_stock === 'true') {
        conditions.push('s.current_stock <= s.min_stock_alert');
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    try {
        const countResult = await db.query(
            `SELECT COUNT(*) FROM seedlings s ${where}`, params
        );

        params.push(limit, offset);
        const result = await db.query(
            `SELECT s.*, c.name_bn AS category_bn, c.name_en AS category_en
             FROM seedlings s
             LEFT JOIN categories c ON s.category_id = c.id
             ${where}
             ORDER BY s.name_bn
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(countResult.rows[0].count / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// একটি চারার বিবরণ
const getSeedlingById = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, c.name_bn AS category_bn, c.name_en AS category_en
             FROM seedlings s
             LEFT JOIN categories c ON s.category_id = c.id
             WHERE s.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'চারা পাওয়া যায়নি।' });
        }

        // স্টক লেজার
        const ledger = await db.query(
            `SELECT * FROM stock_transactions WHERE seedling_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [req.params.id]
        );

        res.json({ success: true, data: result.rows[0], ledger: ledger.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// নতুন চারা যোগ করুন
const createSeedling = async (req, res) => {
    const {
        name_bn, name_en, variety, category_id,
        production_type, unit_price, production_cost,
        min_stock_alert, description
    } = req.body;

    if (!name_bn || !production_type || !unit_price) {
        return res.status(400).json({ success: false, message: 'চারার নাম, পদ্ধতি ও মূল্য দিন।' });
    }

    try {
        // Auto generate seedling code — MAX দিয়ে যেন duplicate না হয়
        const codeResult = await db.query(
            `SELECT COALESCE(MAX(CAST(SUBSTRING(seedling_code FROM 4) AS INTEGER)), 0) AS max_num
             FROM seedlings WHERE seedling_code ~ '^SL-[0-9]+$'`
        );
        const nextNum = parseInt(codeResult.rows[0].max_num) + 1;
        const seedling_code = 'SL-' + String(nextNum).padStart(3, '0');

        const image_url = req.file ? `/uploads/${req.file.filename}` : null;

        const result = await db.query(
            `INSERT INTO seedlings
             (seedling_code, name_bn, name_en, variety, category_id, production_type,
              unit_price, production_cost, min_stock_alert, description, image_url, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING *`,
            [seedling_code, name_bn, name_en, variety, category_id, production_type,
             unit_price, production_cost || 0, min_stock_alert || 20, description, image_url, req.user.id]
        );

        res.status(201).json({ success: true, message: 'চারা যোগ হয়েছে।', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// চারা আপডেট করুন
const updateSeedling = async (req, res) => {
    const { id } = req.params;
    const {
        name_bn, name_en, variety, category_id, production_type,
        unit_price, production_cost, min_stock_alert, description, is_active
    } = req.body;

    try {
        const result = await db.query(
            `UPDATE seedlings SET
             name_bn        = $1,
             name_en        = $2,
             variety        = $3,
             category_id    = $4,
             production_type= $5,
             unit_price     = $6,
             production_cost= $7,
             min_stock_alert= COALESCE($8, min_stock_alert),
             description    = $9,
             is_active      = COALESCE($10, is_active)
             WHERE id = $11
             RETURNING *`,
            [
                name_bn,
                name_en,
                variety,
                category_id,
                production_type,
                unit_price,
                production_cost || 0,
                min_stock_alert || null,
                description,
                is_active !== undefined ? is_active : null,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'চারা পাওয়া যায়নি।' });
        }

        res.json({ success: true, message: 'চারা আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// চারা মুছুন
const deleteSeedling = async (req, res) => {
    try {
        await db.query('UPDATE seedlings SET is_active = FALSE WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'চারা নিষ্ক্রিয় করা হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// কম স্টক সতর্কতা
const getLowStockSeedlings = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, c.name_bn AS category_bn
             FROM seedlings s
             LEFT JOIN categories c ON s.category_id = c.id
             WHERE s.is_active = TRUE AND s.current_stock <= s.min_stock_alert
             ORDER BY s.current_stock ASC`
        );
        res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getAllSeedlings, getSeedlingById, createSeedling, updateSeedling, deleteSeedling, getLowStockSeedlings };
