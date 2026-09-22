const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const Feedback = require('../models/Feedback');
const { serializeSession, serializeFeedback, buildBreakdown, finalizeSession } = require('../services/sessionService');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/feedback/:sessionId
// Returns the session summary, its Feedback document, and a per-question
// breakdown (question + answer + score) for the FeedbackResults /
// InterviewCompleted pages.
exports.getFeedbackForSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!isValidId(sessionId)) {
      return res.status(400).json({ message: 'Invalid session id' });
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session || String(session.user) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({ message: 'This interview session is not finished yet' });
    }

    let feedback = await Feedback.findOne({ session: session._id });
    if (!feedback) {
      // Defensive fallback: a completed session should always have feedback
      // (submitAnswer/completeSession both create it), but regenerate it if
      // it's somehow missing rather than erroring out.
      feedback = await finalizeSession(session);
    }

    const breakdown = await buildBreakdown(session._id);

    res.status(200).json({
      session: serializeSession(session),
      feedback: serializeFeedback(feedback),
      breakdown,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
