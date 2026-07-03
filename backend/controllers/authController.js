const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// ============================================================
// লগইন / Login
// ============================================================
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'ইমেইল ও পাসওয়ার্ড দিন।' });
    }

    try {
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'ইমেইল বা পাসওয়ার্ড ভুল।' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'ইমেইল বা পাসওয়ার্ড ভুল।' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'সফলভাবে লগইন হয়েছে।',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: 'সার্ভার সমস্যা।', error: err.message });
    }
};

// ============================================================
// ব্যবহারকারীর প্রোফাইল / Profile
// ============================================================
const getProfile = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ============================================================
// পাসওয়ার্ড পরিবর্তন / Change Password
// ============================================================
const changePassword = async (req, res) => {
    const { old_password, new_password } = req.body;

    try {
        const result = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];

        const isMatch = await bcrypt.compare(old_password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'পুরনো পাসওয়ার্ড ভুল।' });
        }

        const hashed = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);

        res.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তন হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { login, getProfile, changePassword };
