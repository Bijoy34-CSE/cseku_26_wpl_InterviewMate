const mongoose = require('mongoose');

// A "Practice Again" re-attempt at a question from a completed interview.
// Deliberately a separate collection from Answer/Score (which stay
// immutable records of the original interview) so re-practicing a question
// never rewrites interview history - it just layers new attempts on top.
const practiceAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },

    text: { type: String, required: true },
    wordCount: { type: Number, required: true },

    // Same shape as Score, produced by the same Gemini scoreAnswer flow.
    technicalAccuracy: { type: Number, required: true, min: 0, max: 100 },
    structuralFlow: { type: Number, required: true, min: 0, max: 100 },
    communication: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    relevance: { type: Number, required: true, min: 0, max: 100 },
    overall: { type: Number, required: true, min: 0, max: 100 },
    correctness: { type: Number, default: null },
    completeness: { type: Number, default: null },

    aiFeedback: { type: String, required: true },
    suggestedAnswer: { type: String, required: true },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    missingPoints: { type: [String], default: [] },
    improvementSuggestions: { type: [String], default: [] },

    previousOverall: { type: Number, required: true }, // the score being compared against (original or prior attempt)
    source: { type: String, enum: ['ai', 'fallback'], required: true },
  },
  { timestamps: true }
);

practiceAttemptSchema.index({ question: 1, createdAt: -1 });

module.exports = mongoose.model('PracticeAttempt', practiceAttemptSchema);
