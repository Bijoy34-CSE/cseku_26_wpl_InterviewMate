const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { submitFeedback, listMyFeedback } = require('../controllers/siteFeedbackController');

router.use(protect);

router.post('/', submitFeedback);
router.get('/', listMyFeedback);

module.exports = router;
