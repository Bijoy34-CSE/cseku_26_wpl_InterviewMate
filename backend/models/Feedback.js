const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, unique: true },

    overallScore: { type: Number, required: true, min: 0, max: 100 },

    // Aggregated category scores, averaged across every answered question in the session.
    categoryScores: {
      communication: { type: Number, required: true },
      technicalKnowledge: { type: Number, required: true },
      confidence: { type: Number, required: true },
      answerRelevance: { type: Number, required: true },
      technicalAccuracy: { type: Number, required: true },
      structuralFlow: { type: Number, required: true },
      deliveryPace: { type: Number, required: true },
    },

    // Transparent weighted dimensions (Knowledge 40% / Communication 20% /
    // Behavioral-Professional-Presence 20% / Interview Performance 20%).
    // These derive from the same per-answer Gemini evaluations available in
    // every mode (Text/Audio/Audio+Video), so Text Only mode is never scored
    // zero on "behavioral" - see sessionService.js for how each maps.
    weightedScores: {
      knowledge: { type: Number, required: true },
      communication: { type: Number, required: true },
      behavioral: { type: Number, required: true },
      interviewPerformance: { type: Number, required: true },
    },
    overallPercentage: { type: Number, required: true }, // == overallScore, kept alongside weightedScores for clarity

    assessment: { type: String, required: true }, // the "Dr. Ava's Assessment" paragraph
    strengths: [{ type: String }],
    improvements: [{ type: String }],

    source: { type: String, enum: ['ai', 'fallback'], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
