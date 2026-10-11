const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect Routes - Verifies JWT and attaches the logged-in user to req.user
const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ message: 'Server misconfiguration' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'This account has been disabled. Contact support for assistance.' });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.includes(String(user.email || '').toLowerCase()) && user.role !== 'admin') {
      await User.updateOne({ _id: user._id, role: { $ne: 'admin' } }, { $set: { role: 'admin' } });
      user.role = 'admin';
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired, please log in again' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
    return res.status(500).json({ message: 'Server error while authenticating' });
  }
};

module.exports = { protect };
