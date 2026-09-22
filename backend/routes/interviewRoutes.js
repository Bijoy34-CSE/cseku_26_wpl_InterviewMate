const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSession,
  getSession,
  listSessions,
  submitAnswer,
  completeSession,
  timeoutSession,
} = require('../controllers/interviewController');

// Uploaded resume/syllabus files are parsed in-memory (never written to
// disk) and only their extracted text is kept - see services/documentService.js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches the frontend's stated limit
});

// Turns multer failures (file too large, etc.) into the same JSON error
// shape every other route uses, instead of Express's default HTML error page.
function handleUploadError(err, req, res, next) {
  if (err) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large - maximum size is 10MB.' : err.message;
    return res.status(400).json({ message });
  }
  next();
}

// All interview routes require a logged-in user
router.use(protect);

router.post('/sessions', upload.single('file'), handleUploadError, createSession);
router.get('/sessions', listSessions);
router.get('/sessions/:id', getSession);
router.post('/sessions/:id/answers', submitAnswer);
router.post('/sessions/:id/complete', completeSession);
router.post('/sessions/:id/timeout', timeoutSession);

module.exports = router;
