const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const admin = require('../controllers/adminController');

router.use(protect, requireAdmin);
router.get('/overview', admin.getOverview);
router.get('/users', admin.listUsers);
router.patch('/users/:id/access', admin.updateUserAccess);
router.get('/sessions', admin.listSessions);
router.get('/questions', admin.listQuestions);
router.post('/questions', admin.createPracticeQuestion);
router.patch('/questions/:id', admin.updatePracticeQuestion);
router.get('/feedback', admin.listFeedback);
router.get('/payments', admin.listPayments);
router.patch('/payments/:id', admin.reviewPayment);

module.exports = router;
