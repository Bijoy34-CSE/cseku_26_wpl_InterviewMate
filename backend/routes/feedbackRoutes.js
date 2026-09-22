const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getFeedbackForSession } = require('../controllers/feedbackController');

router.get('/:sessionId', protect, getFeedbackForSession);

module.exports = router;
