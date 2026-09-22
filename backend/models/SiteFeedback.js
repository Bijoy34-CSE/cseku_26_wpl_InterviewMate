const mongoose = require('mongoose');

// User-submitted product feedback (bug reports, feature requests, general
// comments) from the Feedback page - distinct from per-answer AI Feedback
// generated during an interview (see models/Feedback.js).
const siteFeedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      enum: ['Bug Report', 'Feature Request', 'General Feedback', 'Praise'],
      default: 'General Feedback',
    },
    rating: { type: Number, min: 1, max: 5, default: null },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteFeedback', siteFeedbackSchema);
