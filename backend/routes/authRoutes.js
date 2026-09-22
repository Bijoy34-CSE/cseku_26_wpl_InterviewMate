const express = require('express');
const router = express.Router();
const {
  register,
  verifyOtp,
  resendOtp,
  login,
  getMe,
  logout,
  oauthStart,
  oauthCallback,
  authConfig,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public
router.get('/config', authConfig);
router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);

// OAuth (browser redirects, not XHR)
router.get('/google', oauthStart('google'));
router.get('/google/callback', oauthCallback('google'));
router.get('/github', oauthStart('github'));
router.get('/github/callback', oauthCallback('github'));

// Protected
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
