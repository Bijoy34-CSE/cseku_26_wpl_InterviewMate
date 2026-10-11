const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, unique: true },
    text: { type: String, required: true },
    wordCount: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
    responseDurationSeconds: { type: Number, default: null }, // measured client-side from mic start/stop, null if typed

    // Observable audio signals only - see services/mediaAnalysisService.js.
    // Any signal this app cannot actually measure (pauses, camera/gaze,
    // posture) stays null/absent rather than being invented.
    mediaMetrics: {
      speechRate: { type: Number, default: null }, // words per minute
      fillerWordRate: { type: Number, default: null }, // 0-1, share of words that were filler words
      fillerWordCount: { type: Number, default: null },
      pauseCount: { type: Number, default: null }, // measured client-side from microphone level
      longestPauseSeconds: { type: Number, default: null },
      silenceRatio: { type: Number, default: null }, // 0-1 share of recording time that was silent
      // Audio + Video only, and only when the browser can actually measure it.
      faceVisibleRatio: { type: Number, default: null }, // 0-1, needs the browser FaceDetector API
      movementScore: { type: Number, default: null }, // 0-100 frame-difference level
    },
    inputMethod: { type: String, enum: ['typed', 'spoken'], default: 'typed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Answer', answerSchema);
