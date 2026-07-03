const jwt = require('jsonwebtoken');

// JWT Token যাচাই করার middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'প্রবেশাধিকার নেই। লগইন করুন। / Access denied. Please login.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: 'টোকেন মেয়াদোত্তীর্ণ। আবার লগইন করুন। / Token expired. Please login again.'
        });
    }
};

// Role-based access control
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'আপনার এই কাজের অনুমতি নেই। / You do not have permission for this action.'
            });
        }
        next();
    };
};

// শুধু Admin এবং Manager-এর জন্য
const adminOrManager = authorize('admin', 'manager');

// Admin, Manager এবং Production Officer-এর জন্য
const canProduce = authorize('admin', 'manager', 'production_officer');

// Admin, Manager এবং Sales Operator-এর জন্য
const canSell = authorize('admin', 'manager', 'sales_operator');

// শুধু Admin-এর জন্য
const adminOnly = authorize('admin');

module.exports = { authenticate, authorize, adminOrManager, canProduce, canSell, adminOnly };
