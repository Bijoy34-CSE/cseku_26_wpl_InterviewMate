const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  register,
  verifyOtp,
  resendOtp,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
  login,
  getMe,
  logout,
  oauthStart,
  oauthCallback,
  authConfig,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { rateLimit, ipAndEmailKey } = require('../middleware/security');
const {
  getAccount,
  updatePreferences,
  updateProfile,
  requestEmailChange,
  confirmEmailChange,
  changePassword,
  clearHistory,
  deleteAccount,
  getPlan,
  createPaymentRequest,
  listPracticeQuestions,
  updateProfileAvatar,
} = require('../controllers/accountController');

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
      return callback(new Error('Choose a PNG, JPG, or WebP profile image.'));
    }
    callback(null, true);
  },
});

function handleAvatarUploadError(err, req, res, next) {
  if (!err) return next();
  const message = err.code === 'LIMIT_FILE_SIZE'
    ? 'Profile images must be 2MB or smaller.'
    : err.message;
  return res.status(400).json({ message });
}

// Brute-force protection for the public auth endpoints. Per-account limits are
// keyed by IP + email (so a shared network can't lock everyone out); a looser
// per-IP limit catches scripts that rotate through many emails.
const FIFTEEN_MIN = 15 * 60 * 1000;
const authPerIp = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 150,
  message: 'Too many attempts from this network. Please try again in a few minutes.',
});
const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 10,
  keyFn: ipAndEmailKey,
  skipSuccessful: true, // only failed attempts count
  message: 'Too many login attempts. Please wait 15 minutes and try again.',
});
const otpVerifyLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 10,
  keyFn: ipAndEmailKey,
  skipSuccessful: true,
  message: 'Too many incorrect codes. Please wait 15 minutes and try again.',
});
const otpSendLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 5,
  keyFn: ipAndEmailKey,
  message: 'Too many code requests. Please wait 15 minutes before asking for another.',
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyFn: ipAndEmailKey,
  message: 'Too many signup attempts. Please try again later.',
});

// Public
router.get('/config', authConfig);
router.post('/register', authPerIp, registerLimiter, register);
router.post('/verify-otp', authPerIp, otpVerifyLimiter, verifyOtp);
router.post('/resend-otp', authPerIp, otpSendLimiter, resendOtp);
router.post('/password-reset/request', authPerIp, otpSendLimiter, requestPasswordReset);
router.post('/password-reset/verify', authPerIp, otpVerifyLimiter, verifyPasswordResetCode);
router.post('/password-reset/confirm', authPerIp, otpVerifyLimiter, resetPassword);
router.post('/login', authPerIp, loginLimiter, login);

// OAuth (browser redirects, not XHR)
router.get('/google', authPerIp, oauthStart('google'));
router.get('/google/callback', authPerIp, oauthCallback('google'));
router.get('/github', authPerIp, oauthStart('github'));
router.get('/github/callback', authPerIp, oauthCallback('github'));

// Protected
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.get('/account', protect, getAccount);
router.patch('/preferences', protect, updatePreferences);
router.patch('/profile', protect, updateProfile);
router.patch('/profile/avatar', protect, avatarUpload.single('avatar'), handleAvatarUploadError, updateProfileAvatar);
router.post('/email-change', protect, requestEmailChange);
router.post('/email-change/confirm', protect, confirmEmailChange);
router.put('/password', protect, changePassword);
router.delete('/history', protect, clearHistory);
router.delete('/account', protect, deleteAccount);
router.get('/plan', protect, getPlan);
router.post('/payments', protect, createPaymentRequest);
router.get('/practice-questions', protect, listPracticeQuestions);

module.exports = router;
