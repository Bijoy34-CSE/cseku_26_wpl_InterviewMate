const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const Question = require('../models/Question');
const Feedback = require('../models/Feedback');
const SiteFeedback = require('../models/SiteFeedback');
const Payment = require('../models/Payment');
const PracticeQuestion = require('../models/PracticeQuestion');
const { MONTHLY_PREMIUM_PRICE_BDT, YEARLY_PREMIUM_PRICE_BDT, PREMIUM_PLAN_DAYS } = require('../services/planService');

exports.getOverview = async (req, res, next) => {
  try {
    const [users, sessions, feedback, payments, pendingPayments] = await Promise.all([
      User.countDocuments(),
      InterviewSession.countDocuments(),
      SiteFeedback.countDocuments(),
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'pending' }),
    ]);
    const [verifiedRevenue] = await Payment.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const [latestUsers, latestPayments, latestFeedback] = await Promise.all([
      User.find().select('name email role createdAt subscriptionExpiresAt').sort({ createdAt: -1 }).limit(8).lean(),
      Payment.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(8).lean(),
      SiteFeedback.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(8).lean(),
    ]);
    return res.json({
      stats: { users, sessions, feedback, payments, pendingPayments, verifiedRevenueBdt: verifiedRevenue?.total || 0 },
      latestUsers,
      latestPayments,
      latestFeedback,
      monthlyPremiumPriceBdt: MONTHLY_PREMIUM_PRICE_BDT,
      yearlyPremiumPriceBdt: YEARLY_PREMIUM_PRICE_BDT,
    });
  } catch (error) {
    return next(error);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const search = String(req.query.search || '').trim().slice(0, 120);
    const filter = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};
    const [users, total] = await Promise.all([
      User.find(filter).select('name email role isActive createdAt subscriptionExpiresAt freeSessionsUsed freeUsageMonth').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return res.json({ users, page, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    return next(error);
  }
};

exports.updateUserAccess = async (req, res, next) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ message: 'You cannot change your own administrator access here' });
    }
    const updates = {};
    if (typeof req.body?.isActive === 'boolean') updates.isActive = req.body.isActive;
    if (['admin', 'user'].includes(req.body?.role)) updates.role = req.body.role;
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'Provide a valid account access change' });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('name email role isActive subscriptionExpiresAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

exports.listSessions = async (req, res, next) => {
  try {
    const sessions = await InterviewSession.find()
      .populate('user', 'name email')
      .select('-documentText -documentParts')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ sessions });
  } catch (error) {
    return next(error);
  }
};

exports.listQuestions = async (req, res, next) => {
  try {
    const [practiceQuestions, sessionQuestions] = await Promise.all([
      PracticeQuestion.find().populate('createdBy', 'name email').sort({ createdAt: -1 }).limit(250).lean(),
      Question.find().populate({ path: 'session', select: 'user purpose', populate: { path: 'user', select: 'name email' } }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return res.json({ practiceQuestions, sessionQuestions });
  } catch (error) {
    return next(error);
  }
};

exports.createPracticeQuestion = async (req, res, next) => {
  try {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    const difficulty = req.body?.difficulty || 'Medium';
    if (question.length < 8 || question.length > 2000 || !topic || topic.length > 100 ||
        !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({ message: 'Provide a question, topic, and valid difficulty' });
    }
    const created = await PracticeQuestion.create({ question, topic, difficulty, createdBy: req.user._id });
    return res.status(201).json({ question: created });
  } catch (error) {
    return next(error);
  }
};

exports.updatePracticeQuestion = async (req, res, next) => {
  try {
    const updates = {};
    if (typeof req.body?.active === 'boolean') updates.active = req.body.active;
    if (typeof req.body?.question === 'string' && req.body.question.trim().length >= 8) {
      updates.question = req.body.question.trim();
    }
    if (typeof req.body?.topic === 'string' && req.body.topic.trim()) updates.topic = req.body.topic.trim();
    if (['Easy', 'Medium', 'Hard'].includes(req.body?.difficulty)) updates.difficulty = req.body.difficulty;
    const question = await PracticeQuestion.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!question) return res.status(404).json({ message: 'Practice question not found' });
    return res.json({ question });
  } catch (error) {
    return next(error);
  }
};

exports.listFeedback = async (req, res, next) => {
  try {
    const [siteFeedback, interviewFeedback] = await Promise.all([
      SiteFeedback.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(200).lean(),
      Feedback.find().populate('session', 'user purpose completedAt').sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return res.json({ siteFeedback, interviewFeedback });
  } catch (error) {
    return next(error);
  }
};

exports.listPayments = async (req, res, next) => {
  try {
    const [recentPayments, pendingPayments] = await Promise.all([
      Payment.find()
        .populate('user', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      Payment.find({ status: 'pending' })
        .populate('user', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    const paymentsById = new Map(
      [...recentPayments, ...pendingPayments].map((payment) => [String(payment._id), payment])
    );
    const payments = [...paymentsById.values()].sort(
      (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
    );
    return res.json({
      payments,
      monthlyPremiumPriceBdt: MONTHLY_PREMIUM_PRICE_BDT,
      yearlyPremiumPriceBdt: YEARLY_PREMIUM_PRICE_BDT,
    });
  } catch (error) {
    return next(error);
  }
};

exports.reviewPayment = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Payment status must be approved or rejected' });
    }
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        $set: {
          status,
          adminNote: typeof adminNote === 'string' ? adminNote.trim().slice(0, 500) : '',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!payment) return res.status(404).json({ message: 'Pending payment not found' });

    if (status === 'approved') {
      const now = new Date();
      const user = await User.findById(payment.user);
      if (!user) {
        payment.status = 'pending';
        payment.adminNote = 'Approval failed: account no longer exists';
        payment.reviewedBy = null;
        payment.reviewedAt = null;
        await payment.save();
        return res.status(409).json({ message: 'Payment owner no longer exists; payment left unapproved' });
      }
      const base = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now ? user.subscriptionExpiresAt : now;
      const planDays = PREMIUM_PLAN_DAYS[payment.plan] || PREMIUM_PLAN_DAYS.monthly;
      const expires = new Date(base.getTime() + planDays * 24 * 60 * 60 * 1000);
      user.subscriptionExpiresAt = expires;
      try {
        await user.save();
      } catch (error) {
        await Payment.updateOne(
          { _id: payment._id, status: 'approved', reviewedBy: req.user._id },
          { $set: { status: 'pending', reviewedBy: null, reviewedAt: null, adminNote: 'Premium activation failed; retry verification' } }
        );
        throw error;
      }
    }
    return res.json({ payment });
  } catch (error) {
    return next(error);
  }
};
