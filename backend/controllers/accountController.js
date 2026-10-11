const bcrypt = require('bcryptjs');
const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Score = require('../models/Score');
const Feedback = require('../models/Feedback');
const PracticeAttempt = require('../models/PracticeAttempt');
const SiteFeedback = require('../models/SiteFeedback');
const Payment = require('../models/Payment');
const PracticeQuestion = require('../models/PracticeQuestion');
const { issueOtp, verifyOtp, resendCooldownRemaining, OTP_TTL_MINUTES } = require('../services/otpService');
const { sendEmailChangeVerificationEmail } = require('../services/emailService');
const { planStatus, premiumPrice, paymentMerchantAccounts } = require('../services/planService');

const PREFERENCE_KEYS = new Set([
  'emailNotif',
  'interviewReminders',
  'performanceReports',
  'practiceSuggestions',
  'adaptiveDifficulty',
  'autoPlay',
  'speakingSpeed',
  'modalityMode',
  'difficulty',
  'questionCount',
  'feedbackDetail',
  'interviewStyle',
  'voiceSpeaker',
]);

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || '',
    mobile: user.mobile,
    university: user.university,
    profile: user.profile || {},
    avatar: user.avatar || '',
    passwordLastChanged: user.passwordLastChanged,
    provider: user.provider,
    role: user.role,
    isActive: user.isActive,
    preferences: user.preferences || {},
    pendingEmail: user.pendingEmail || null,
  };
}

async function removeInterviewData(userId) {
  const sessions = await InterviewSession.find({ user: userId }).select('_id').lean();
  const sessionIds = sessions.map(({ _id }) => _id);

  await Promise.all([
    Question.deleteMany({ session: { $in: sessionIds } }),
    Answer.deleteMany({ session: { $in: sessionIds } }),
    Score.deleteMany({ session: { $in: sessionIds } }),
    Feedback.deleteMany({ session: { $in: sessionIds } }),
    PracticeAttempt.deleteMany({ user: userId }),
    InterviewSession.deleteMany({ user: userId }),
  ]);
}

exports.getAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const { preferences } = req.body || {};
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
      return res.status(400).json({ message: 'Preferences must be an object' });
    }

    const entries = Object.entries(preferences);
    if (!entries.length || entries.some(([key]) => !PREFERENCE_KEYS.has(key))) {
      return res.status(400).json({ message: 'One or more preference fields are not supported' });
    }

    const booleanKeys = new Set([
      'emailNotif', 'interviewReminders', 'performanceReports', 'practiceSuggestions',
      'adaptiveDifficulty', 'autoPlay',
    ]);
    for (const [key, value] of entries) {
      if (booleanKeys.has(key) && typeof value !== 'boolean') {
        return res.status(400).json({ message: `${key} must be true or false` });
      }
      if (key === 'speakingSpeed' && (typeof value !== 'number' || value < 0.5 || value > 2)) {
        return res.status(400).json({ message: 'Speaking speed must be between 0.5 and 2' });
      }
      if (key === 'modalityMode' && !['voice', 'text', 'video'].includes(value)) {
        return res.status(400).json({ message: 'Invalid interview modality' });
      }
      if (['difficulty', 'questionCount', 'feedbackDetail', 'interviewStyle', 'voiceSpeaker'].includes(key) &&
          (typeof value !== 'string' || value.length > 100)) {
        return res.status(400).json({ message: `Invalid ${key}` });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    user.preferences = { ...(user.preferences || {}), ...preferences };
    await user.save();
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, university, profile } = req.body || {};
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)) {
      return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
    }
    if (university !== undefined && (typeof university !== 'string' || university.trim().length > 120)) {
      return res.status(400).json({ message: 'University must be 120 characters or fewer' });
    }
    if (profile !== undefined && (!profile || typeof profile !== 'object' || Array.isArray(profile))) {
      return res.status(400).json({ message: 'Profile details must be an object' });
    }

    const stringKeys = ['degree', 'department', 'degreeAndYear', 'location', 'status', 'target'];
    const arrayKeys = ['targetRoles', 'technicalSkills'];
    const allowed = new Set([...stringKeys, ...arrayKeys]);
    const entries = Object.entries(profile || {});
    if (entries.some(([key]) => !allowed.has(key))) {
      return res.status(400).json({ message: 'One or more profile fields are not supported' });
    }
    for (const [key, value] of entries) {
      if (stringKeys.includes(key) && (typeof value !== 'string' || value.trim().length > 120)) {
        return res.status(400).json({ message: `${key} must be text of 120 characters or fewer` });
      }
      if (arrayKeys.includes(key) &&
          (!Array.isArray(value) || value.length > 30 ||
            value.some((item) => typeof item !== 'string' || item.trim().length < 1 || item.trim().length > 60))) {
        return res.status(400).json({ message: `${key} must contain at most 30 short text values` });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (name !== undefined) user.name = name.trim();
    if (university !== undefined) user.university = university.trim();
    if (profile) {
      for (const [key, value] of entries) {
        user.set(`profile.${key}`, Array.isArray(value)
          ? [...new Set(value.map((item) => item.trim()))]
          : value.trim());
      }
    }
    await user.save();
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

exports.updateProfileAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Choose a profile image to upload.' });
    }

    const signatures = {
      'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
      'image/webp': Buffer.from('RIFF'),
    };
    const signature = signatures[req.file.mimetype];
    const hasValidSignature = signature &&
      req.file.buffer.subarray(0, signature.length).equals(signature) &&
      (req.file.mimetype !== 'image/webp' || req.file.buffer.toString('ascii', 8, 12) === 'WEBP');
    if (!hasValidSignature) {
      return res.status(400).json({ message: 'The selected file is not a valid PNG, JPG, or WebP image.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    user.avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    await user.save();
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

exports.requestEmailChange = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (email === user.email) return res.status(400).json({ message: 'This is already your current email' });
    const existingUser = await User.findOne({ email }).select('_id');
    if (existingUser) return res.status(409).json({ message: 'That email address is already in use' });

    const cooldown = resendCooldownRemaining(user, 'emailChange');
    if (cooldown > 0) {
      return res.status(429).json({ message: `Please wait ${cooldown} seconds before requesting another code` });
    }

    user.pendingEmail = email;
    const code = await issueOtp(user, 'emailChange');
    try {
      await sendEmailChangeVerificationEmail(email, code, OTP_TTL_MINUTES);
    } catch (error) {
      user.pendingEmail = null;
      user.emailChangeOtpHash = null;
      user.emailChangeOtpExpiresAt = null;
      user.emailChangeOtpAttempts = 0;
      user.emailChangeOtpLastSentAt = null;
      await user.save();
      throw error;
    }
    await user.save();
    return res.json({ message: `A verification code was sent to ${email}`, pendingEmail: email });
  } catch (error) {
    return next(error);
  }
};

exports.confirmEmailChange = async (req, res, next) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Enter the six-digit verification code' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (!user.pendingEmail) return res.status(400).json({ message: 'Request an email change before confirming a code' });

    const result = await verifyOtp(user, code, 'emailChange');
    if (!result.ok) {
      await user.save();
      return res.status(400).json({ message: result.reason });
    }
    const existingUser = await User.findOne({ email: user.pendingEmail, _id: { $ne: user._id } }).select('_id');
    if (existingUser) return res.status(409).json({ message: 'That email address is already in use' });

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailChangeOtpLastSentAt = null;
    await user.save();
    return res.json({ message: 'Email address updated', user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That email address is already in use' });
    return next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' ||
        newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ message: 'Enter your current password and a new password of 8 to 128 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (!user.password) {
      return res.status(400).json({ message: 'Password changes for this account are managed by your sign-in provider' });
    }
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) return res.status(401).json({ message: 'Current password is incorrect' });
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ message: 'Choose a password different from your current password' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordLastChanged = new Date();
    await user.save();
    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
};

exports.clearHistory = async (req, res, next) => {
  try {
    await removeInterviewData(req.user._id);
    return res.json({ message: 'Interview history deleted' });
  } catch (error) {
    return next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const { password, confirmation, email } = req.body || {};
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ message: 'Type DELETE to confirm account deletion' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.password) {
      if (typeof password !== 'string') {
        return res.status(400).json({ message: 'Enter your password to delete this account' });
      }
      if (!(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Password is incorrect' });
      }
    } else if (typeof email !== 'string' || email.trim().toLowerCase() !== user.email) {
      return res.status(401).json({ message: 'Enter your account email to confirm deletion' });
    }

    await removeInterviewData(user._id);
    await SiteFeedback.deleteMany({ user: user._id });
    await Payment.deleteMany({ user: user._id });
    await PracticeQuestion.deleteMany({ createdBy: user._id });
    await User.deleteOne({ _id: user._id });
    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

exports.getPlan = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('role subscriptionExpiresAt freeSessionsUsed freeUsageMonth');
    if (!user) return res.status(404).json({ message: 'Account not found' });
    const [pendingPayment, latestPayment] = await Promise.all([
      Payment.findOne({ user: user._id, status: 'pending' }).select('provider payerNumber amount plan createdAt'),
      Payment.findOne({ user: user._id }).select('provider payerNumber amount plan status adminNote createdAt reviewedAt').sort({ createdAt: -1 }),
    ]);
    return res.json({
      plan: planStatus(user),
      pendingPayment,
      latestPayment,
      paymentInstructions: {
        mode: 'manual_verification',
        merchantAccounts: paymentMerchantAccounts(),
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.createPaymentRequest = async (req, res, next) => {
  try {
    const provider = req.body?.provider;
    const plan = req.body?.plan === undefined ? 'monthly' : req.body.plan;
    const payerNumber = typeof req.body?.payerNumber === 'string' ? req.body.payerNumber.trim() : '';
    const reference = typeof req.body?.providerReference === 'string' ? req.body.providerReference.trim() : '';
    if (!['bkash', 'nagad', 'rocket'].includes(provider)) {
      return res.status(400).json({ message: 'Choose bKash, Nagad, or Rocket' });
    }
    if (!/^\+?[0-9]{8,15}$/.test(payerNumber)) {
      return res.status(400).json({ message: 'Enter a valid payment account number (8 to 15 digits)' });
    }
    const amount = premiumPrice(plan);
    if (amount === null) return res.status(400).json({ message: 'Choose a valid Premium plan' });
    if (reference.length < 6 || reference.length > 120) {
      return res.status(400).json({ message: 'Enter the transaction reference from your payment receipt' });
    }
    const pendingPayment = await Payment.findOne({ user: req.user._id, status: 'pending' });
    if (pendingPayment) return res.status(409).json({ message: 'You already have a payment awaiting verification' });
    const payment = await Payment.create({
      user: req.user._id,
      provider,
      payerNumber,
      providerReference: reference,
      plan,
      amount,
    });
    return res.status(201).json({
      payment,
      message: 'Payment request sent to the administrator. Premium starts after the transaction is verified and approved.',
    });
  } catch (error) {
    if (error.code === 11000) {
      const message = error.keyPattern?.user
        ? 'You already have a payment awaiting verification'
        : 'That transaction reference has already been submitted';
      return res.status(409).json({ message });
    }
    return next(error);
  }
};

exports.listPracticeQuestions = async (req, res, next) => {
  try {
    const questions = await PracticeQuestion.find({ active: true })
      .select('question topic difficulty')
      .sort({ createdAt: -1 })
      .limit(250)
      .lean();
    return res.json({ questions });
  } catch (error) {
    return next(error);
  }
};
