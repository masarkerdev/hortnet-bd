const db = require('../config/db');

// ============================================================
// STOCK CONTROLLER
// ============================================================

// স্টক সারসংক্ষেপ দেখুন
const getStockSummary = async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM stock_summary ORDER BY name_bn`);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// স্টক লেনদেনের ইতিহাস
const getStockLedger = async (req, res) => {
    const { seedling_id, txn_type, from_date, to_date, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (seedling_id) { params.push(seedling_id); conditions.push(`st.seedling_id = $${params.length}`); }
    if (txn_type) { params.push(txn_type); conditions.push(`st.txn_type = $${params.length}`); }
    if (from_date) { params.push(from_date); conditions.push(`st.created_at >= $${params.length}`); }
    if (to_date) { params.push(to_date); conditions.push(`st.created_at <= $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    try {
        params.push(limit, offset);
        const result = await db.query(
            `SELECT st.*, s.name_bn, s.seedling_code, u.name AS user_name
             FROM stock_transactions st
             LEFT JOIN seedlings s ON st.seedling_id = s.id
             LEFT JOIN users u ON st.created_by = u.id
             ${where}
             ORDER BY st.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ম্যানুয়াল স্টক সমন্বয়
const stockAdjustment = async (req, res) => {
    const { seedling_id, quantity, direction, notes } = req.body;

    if (!seedling_id || !quantity || !direction) {
        return res.status(400).json({ success: false, message: 'চারা, পরিমাণ ও দিক নির্বাচন করুন।' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const stockResult = await client.query(
            'SELECT current_stock FROM seedlings WHERE id = $1', [seedling_id]
        );

        if (stockResult.rows.length === 0) {
            throw new Error('চারা পাওয়া যায়নি।');
        }

        let currentStock = parseInt(stockResult.rows[0].current_stock);
        let newBalance;

        if (direction === '+') {
            newBalance = currentStock + parseInt(quantity);
        } else {
            if (currentStock < parseInt(quantity)) {
                throw new Error(`স্টক পর্যাপ্ত নেই। আছে: ${currentStock}`);
            }
            newBalance = currentStock - parseInt(quantity);
        }

        await client.query(
            `INSERT INTO stock_transactions
             (seedling_id, txn_type, quantity, direction, balance_after, notes, created_by)
             VALUES ($1,'adjustment',$2,$3,$4,$5,$6)`,
            [seedling_id, quantity, direction, newBalance, notes || 'ম্যানুয়াল সমন্বয়', req.user.id]
        );

        await client.query(
            'UPDATE seedlings SET current_stock = $1 WHERE id = $2', [newBalance, seedling_id]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'স্টক সমন্বয় সম্পন্ন।', new_balance: newBalance });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

// ============================================================
// DAMAGE CONTROLLER
// ============================================================

const getAllDamages = async (req, res) => {
    const { seedling_id, reason, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (seedling_id) { params.push(seedling_id); conditions.push(`d.seedling_id = $${params.length}`); }
    if (reason) { params.push(reason); conditions.push(`d.reason = $${params.length}`); }
    if (from_date) { params.push(from_date); conditions.push(`d.damage_date >= $${params.length}`); }
    if (to_date) { params.push(to_date); conditions.push(`d.damage_date <= $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    try {
        params.push(limit, offset);
        const result = await db.query(
            `SELECT d.*, s.name_bn, s.seedling_code, pb.batch_code, u.name AS reporter
             FROM damages d
             LEFT JOIN seedlings s ON d.seedling_id = s.id
             LEFT JOIN production_batches pb ON d.batch_id = pb.id
             LEFT JOIN users u ON d.reported_by = u.id
             ${where}
             ORDER BY d.damage_date DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const reportDamage = async (req, res) => {
    const { seedling_id, batch_id, damage_date, quantity, reason, remarks } = req.body;

    if (!seedling_id || !quantity || !reason) {
        return res.status(400).json({ success: false, message: 'চারা, পরিমাণ ও কারণ দিন।' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // ক্ষতি রেকর্ড করুন
        const damageResult = await client.query(
            `INSERT INTO damages (seedling_id, batch_id, damage_date, quantity, reason, remarks, reported_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [seedling_id, batch_id || null, damage_date || new Date().toISOString().split('T')[0],
             quantity, reason, remarks, req.user.id]
        );

        // স্টক কমান
        const stockResult = await client.query(
            'SELECT current_stock FROM seedlings WHERE id = $1', [seedling_id]
        );
        const currentStock = parseInt(stockResult.rows[0].current_stock);
        const newBalance = Math.max(0, currentStock - parseInt(quantity));

        await client.query(
            `INSERT INTO stock_transactions
             (seedling_id, batch_id, txn_type, quantity, direction, balance_after, reference_id, reference_type, notes, created_by)
             VALUES ($1,$2,'damage',$3,'-',$4,$5,'damage',$6,$7)`,
            [seedling_id, batch_id || null, quantity, newBalance,
             damageResult.rows[0].id, `ক্ষতি: ${reason}`, req.user.id]
        );

        await client.query(
            'UPDATE seedlings SET current_stock = $1 WHERE id = $2', [newBalance, seedling_id]
        );

        // ব্যাচ আপডেট করুন
        if (batch_id) {
            await client.query(
                `UPDATE production_batches
                 SET available_quantity = GREATEST(0, available_quantity - $1)
                 WHERE id = $2`,
                [quantity, batch_id]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'ক্ষতির রিপোর্ট দাখিল হয়েছে।', data: damageResult.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

// ============================================================
// DASHBOARD CONTROLLER
// ============================================================

const getDashboardStats = async (req, res) => {
    try {
        // সব stats একটি query-তে — Serverless-এ দ্রুত কাজ করে
        const result = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM seedlings WHERE is_active = TRUE) AS seedling_types,
                (SELECT COALESCE(SUM(current_stock), 0) FROM seedlings WHERE is_active = TRUE) AS total_stock,
                (SELECT COALESCE(SUM(produced_quantity), 0) FROM production_batches) AS today_production,
                (SELECT COUNT(*) FROM sales WHERE sale_date = CURRENT_DATE) AS today_invoices,
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE sale_date = CURRENT_DATE) AS today_revenue,
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales) +
                (SELECT COALESCE(SUM(amount), 0) FROM other_income) AS monthly_revenue,
                (SELECT COUNT(*) FROM seedlings WHERE is_active = TRUE AND current_stock <= min_stock_alert) AS low_stock_count
        `);

        const d = result.rows[0];

        // Success rates আলাদাভাবে (optional — timeout হলে empty দেখাবে)
        let successRates = [];
        try {
            const srResult = await db.query(`
                SELECT production_type,
                    ROUND(AVG(COALESCE(success_percent, germination_percent,
                        CASE WHEN seed_quantity > 0 THEN LEAST(100, (produced_quantity::NUMERIC/seed_quantity)*100)
                             ELSE 0 END)), 1) AS avg_success_percent,
                    COUNT(*) AS batch_count
                FROM production_batches
                GROUP BY production_type
                HAVING COUNT(*) > 0
            `);
            successRates = srResult.rows;
        } catch(e) { /* success rates না আসলেও চলবে */ }

        res.json({
            success: true,
            data: {
                seedling_types:   parseInt(d.seedling_types) || 0,
                total_stock:      parseInt(d.total_stock) || 0,
                today_production: parseInt(d.today_production) || 0,
                today_invoices:   parseInt(d.today_invoices) || 0,
                today_revenue:    parseFloat(d.today_revenue) || 0,
                monthly_revenue:  parseFloat(d.monthly_revenue) || 0,
                low_stock_count:  parseInt(d.low_stock_count) || 0,
                success_rates:    successRates
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getStockSummary, getStockLedger, stockAdjustment,
    getAllDamages, reportDamage,
    getDashboardStats
};
