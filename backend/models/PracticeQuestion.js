const mongoose = require('mongoose');

const practiceQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 2000 },
    topic: { type: String, required: true, trim: true, maxlength: 100 },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PracticeQuestion', practiceQuestionSchema);
