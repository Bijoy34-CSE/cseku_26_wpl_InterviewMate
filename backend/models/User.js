const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Full name is derived from the parts below (see buildFullName / pre-save).
  // Kept as its own field so existing code that reads `user.name` keeps working.
  name: { type: String, required: true },
  firstName: { type: String, trim: true, default: '' },
  middleName: { type: String, trim: true, default: '' },
  lastName: { type: String, trim: true, default: '' },

  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true, default: '' },
  university: { type: String, trim: true, default: '' },
  profile: {
    degree: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    degreeAndYear: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: 'ACTIVE' },
    target: { type: String, trim: true, default: 'TARGET: NOT SET' },
    targetRoles: { type: [String], default: [] },
    technicalSkills: { type: [String], default: [] },
  },
  passwordLastChanged: { type: Date, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  isActive: { type: Boolean, default: true, index: true },
  lastLoginAt: { type: Date, default: null },
  subscriptionExpiresAt: { type: Date, default: null, index: true },
  freeSessionsUsed: { type: Number, default: 0, min: 0 },
  freeUsageMonth: { type: String, default: '' },

  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      emailNotif: true,
      interviewReminders: true,
      performanceReports: true,
      practiceSuggestions: false,
      adaptiveDifficulty: true,
      autoPlay: false,
      speakingSpeed: 1,
      modalityMode: 'voice',
      difficulty: 'Adaptive (Auto)',
      questionCount: '10 Questions',
      feedbackDetail: 'Detailed Rubric',
      interviewStyle: 'Academic Board',
      voiceSpeaker: 'Dr. Ava (British English)',
    }),
  },

  // Optional for OAuth accounts (they authenticate via the provider instead).
  password: { type: String, default: null },

  // Email verification. Local signups start unverified and must confirm an
  // emailed OTP; OAuth signups are trusted as already verified by the provider.
  isVerified: { type: Boolean, default: false },
  otpHash: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date, default: null },

  passwordResetOtpHash: { type: String, default: null },
  passwordResetOtpExpiresAt: { type: Date, default: null },
  passwordResetOtpAttempts: { type: Number, default: 0 },
  passwordResetOtpLastSentAt: { type: Date, default: null },

  pendingEmail: { type: String, lowercase: true, trim: true, default: null },
  emailChangeOtpHash: { type: String, default: null },
  emailChangeOtpExpiresAt: { type: Date, default: null },
  emailChangeOtpAttempts: { type: Number, default: 0 },
  emailChangeOtpLastSentAt: { type: Date, default: null },

  // OAuth linkage
  provider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
  providerId: { type: String, default: null },
  avatarUrl: { type: String, default: '' },
}, { timestamps: true });

// Fast lookup when resolving an OAuth callback to an existing account
userSchema.index({ provider: 1, providerId: 1 });

userSchema.statics.buildFullName = function (first, middle, last) {
  return [first, middle, last]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
};

module.exports = mongoose.model('User', userSchema);
