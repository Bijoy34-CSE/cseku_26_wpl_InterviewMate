const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, unique: true },
    answer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', required: true },

    // 0-100 sub-scores. Names line up with what the existing FeedbackResults / InterviewCompleted UI already displays.
    technicalAccuracy: { type: Number, required: true, min: 0, max: 100 },
    structuralFlow: { type: Number, required: true, min: 0, max: 100 },
    communication: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    relevance: { type: Number, required: true, min: 0, max: 100 },
    overall: { type: Number, required: true, min: 0, max: 100 },

    aiFeedback: { type: String, required: true }, // short per-answer critique
    suggestedAnswer: { type: String, required: true }, // a model/reference answer
    correctness: { type: Number, default: null },
    completeness: { type: Number, default: null },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    missingPoints: { type: [String], default: [] }, // relevant points from the document the candidate didn't mention
    improvementSuggestions: { type: [String], default: [] },
    evidenceFromDocument: { type: [String], default: [] }, // document passages/facts used to judge this answer
    performanceImpact: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },

    source: { type: String, enum: ['ai', 'fallback'], required: true }, // was this scored by a real AI provider or the heuristic fallback
  },
  { timestamps: true }
);

module.exports = mongoose.model('Score', scoreSchema);
