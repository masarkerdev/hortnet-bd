const bcrypt = require('bcryptjs');
const db = require('../config/db');

// সকল ব্যবহারকারী দেখুন
const getAllUsers = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, role, is_active, created_at, password_request_status FROM users ORDER BY created_at DESC'
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// নতুন ব্যবহারকারী তৈরি করুন
const createUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'সব তথ্য পূরণ করুন।' });
    }

    try {
        const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (exists.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'এই ইমেইল আগে থেকে আছে।' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const result = await db.query(
            `INSERT INTO users (name, email, password, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role, created_at`,
            [name, email, hashed, role]
        );

        res.status(201).json({ success: true, message: 'ব্যবহারকারী তৈরি হয়েছে।', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ব্যবহারকারী আপডেট করুন
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, role, is_active } = req.body;

    try {
        const result = await db.query(
            `UPDATE users SET name=$1, role=$2, is_active=$3
             WHERE id=$4 RETURNING id, name, email, role, is_active`,
            [name, role, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ব্যবহারকারী পাওয়া যায়নি।' });
        }

        res.json({ success: true, message: 'আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ব্যবহারকারী স্থায়ীভাবে মুছুন
const deleteUser = async (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ success: false, message: 'নিজেকে মুছতে পারবেন না।' });
    }
    try {
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true, message: 'ব্যবহারকারী স্থায়ীভাবে মুছে ফেলা হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };
