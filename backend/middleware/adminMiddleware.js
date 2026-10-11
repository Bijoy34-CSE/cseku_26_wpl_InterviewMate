const User = require('../models/User');

const configuredAdmins = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

async function requireAdmin(req, res, next) {
  try {
    const admins = configuredAdmins();
    const isConfiguredAdmin = admins.includes(String(req.user.email || '').toLowerCase());
    if (!isConfiguredAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        code: 'ADMIN_REQUIRED',
        message: 'Administrator access is required',
      });
    }

    if (isConfiguredAdmin && req.user.role !== 'admin') {
      await User.updateOne({ _id: req.user._id, role: { $ne: 'admin' } }, { $set: { role: 'admin' } });
      req.user.role = 'admin';
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireAdmin };
