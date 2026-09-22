const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
    index: { type: Number, required: true }, // 0-based position within the session
    text: { type: String, required: true },
    category: { type: String, required: true }, // e.g. "Technical", "Behavioral", "System Design"
    difficulty: { type: String, required: true }, // Easy | Intermediate | Hard - set by the adaptive engine for this specific question
    source: { type: String, enum: ['ai', 'fallback'], required: true }, // which generator actually produced this question's text
  },
  { timestamps: true }
);

questionSchema.index({ session: 1, index: 1 }, { unique: true });

module.exports = mongoose.model('Question', questionSchema);
