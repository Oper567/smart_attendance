// src/middleware/auth.js
const jwt = require('jsonwebtoken');

const authorize = (roles = []) => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            // Check if lecturer is approved
            if (decoded.role === 'LECTURER' && !decoded.isApproved) {
                return res.status(403).json({ error: 'Account pending admin approval' });
            }
            req.user = decoded;
            next();
        } catch (err) {
            res.status(401).json({ error: 'Invalid Token' });
        }
    };
};

module.exports = authorize;