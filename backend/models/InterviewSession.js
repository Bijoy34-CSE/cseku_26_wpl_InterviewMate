const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Configuration captured from the Start Interview wizard
    purpose: { type: String, required: true },
    type: { type: String, required: true },
    difficulty: { type: String, required: true }, // initial difficulty; the adaptive engine may move away from this as the session progresses
    level: { type: String },
    durationLabel: { type: String }, // e.g. "15 Mins" (kept for display parity with the existing UI)
    mode: { type: String },
    materials: { type: String, default: null }, // uploaded filename, if any
    documentText: { type: String, default: null }, // extracted text from the uploaded file, used to ground AI-generated questions
    // Visual content Gemini can analyse alongside the text: the whole PDF
    // (native document understanding) or embedded images extracted from a
    // DOCX/PPTX. Kept so later adaptive questions can still see it, not
    // just the first one generated right after upload.
    documentParts: {
      type: [{ mimeType: { type: String, required: true }, data: { type: String, required: true } }],
      default: [],
    },

    totalQuestions: { type: Number, required: true, min: 1 },
    currentQuestionIndex: { type: Number, default: 0 }, // 0-based count of questions already asked

    // Global interview timer (authoritative on the backend - the frontend's
    // countdown is just a display, never trusted for enforcement). The
    // candidate may spend different amounts of time on different questions;
    // only the total elapsed time against deadlineAt matters.
    durationMinutes: { type: Number, default: null },
    deadlineAt: { type: Date, default: null },
    timedOut: { type: Boolean, default: false },
    completionRate: { type: Number, default: null }, // 0-100, set when the session finishes

    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress', index: true },

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
