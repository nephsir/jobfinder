const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log('[AUTH] Checking auth for', req.method, req.path, '- header:', authHeader ? 'Bearer ...' + authHeader.slice(-10) : 'NONE');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[AUTH] FAILED: No auth header');
            return res.status(401).json({ statusCode: 401, message: 'Not authenticated' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password').lean();
        if (!user) {
            console.log('[AUTH] FAILED: User not found for id', decoded.userId);
            return res.status(401).json({ statusCode: 401, message: 'User not found' });
        }
        console.log('[AUTH] SUCCESS: User', user._id.toString(), user.email);
        req.user = { id: user._id.toString(), ...user };
        next();
    } catch (err) {
        console.log('[AUTH] FAILED:', err.name, err.message);
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ statusCode: 401, message: 'Invalid or expired token' });
        }
        return res.status(500).json({ statusCode: 500, message: 'Auth error', error: err.message });
    }
};

module.exports = { authMiddleware };
