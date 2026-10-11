const test = require('node:test');
const assert = require('node:assert/strict');
const { issueOtp, verifyOtp } = require('../services/otpService');
const { currentUsageMonth, hasActivePremium, planStatus, premiumPrice, PREMIUM_PLAN_DAYS, paymentMerchantAccounts, isPaymentMethodConfigured } = require('../services/planService');
const { parseSetup, normalizeScore } = require('../services/interviewPolicy');
const { aggregate } = require('../services/sessionService');
const { requireAdmin } = require('../middleware/adminMiddleware');
const User = require('../models/User');
const Payment = require('../models/Payment');
const adminController = require('../controllers/adminController');

test('free plan resets usage at the UTC calendar month boundary', () => {
  const now = new Date('2026-10-07T12:00:00.000Z');
  assert.equal(currentUsageMonth(now), '2026-10');
  assert.deepEqual(planStatus({ freeUsageMonth: '2026-09', freeSessionsUsed: 3 }, now), {
    plan: 'free',
    isUnlimited: false,
    subscriptionExpiresAt: null,
    monthlyPriceBdt: 499,
    yearlyPriceBdt: 2999,
    freeSessionsUsed: 0,
    freeSessionsLimit: 3,
    freeSessionsRemaining: 3,
    month: '2026-10',
  });
});

test('administrators have unlimited Premium access independent of subscription expiry', () => {
  const now = new Date('2026-10-07T12:00:00.000Z');
  const admin = {
    role: 'admin',
    subscriptionExpiresAt: null,
    freeUsageMonth: '2026-10',
    freeSessionsUsed: 300,
  };
  assert.equal(hasActivePremium(admin, now), true);
  assert.deepEqual(planStatus(admin, now), {
    plan: 'premium',
    isUnlimited: true,
    subscriptionExpiresAt: null,
    monthlyPriceBdt: 499,
    yearlyPriceBdt: 2999,
    freeSessionsUsed: 300,
    freeSessionsLimit: 3,
    freeSessionsRemaining: null,
    month: '2026-10',
  });
});

test('Premium has validated monthly/yearly prices and matching access periods', () => {
  assert.equal(premiumPrice('monthly'), 499);
  assert.equal(premiumPrice('yearly'), 2999);
  assert.equal(premiumPrice('invalid'), null);
  assert.deepEqual(PREMIUM_PLAN_DAYS, { monthly: 30, yearly: 365 });
});

test('interview setup accepts the four purposes without requiring an interview type', () => {
  const base = {
    difficulty: 'Intermediate',
    level: 'Mid-Level',
    duration: '15 Mins',
    questions: '10 Questions',
    mode: 'Text Response',
  };
  for (const purpose of ['Job Interview', 'Academic Viva', 'Internship Interview', 'Thesis Defense']) {
    const parsed = parseSetup({ ...base, purpose });
    assert.equal(parsed.error, undefined, `${purpose} should be accepted`);
    assert.equal(parsed.value.purpose, purpose);
    assert.ok(parsed.value.type, 'the legacy category is derived internally');
  }
  assert.match(parseSetup({ ...base, purpose: 'Certification Prep' }).error, /Choose Job Interview/);
});

test('score normalization clamps dimensions and derives typed delivery from communication', () => {
  const normalized = normalizeScore({
    technicalAccuracy: 110,
    structuralFlow: 70.4,
    communication: 80,
    confidence: 25,
    relevance: -2,
  }, { spoken: false });
  assert.equal(normalized.technicalAccuracy, 100);
  assert.equal(normalized.structuralFlow, 70);
  assert.equal(normalized.confidence, 80);
  assert.equal(normalized.relevance, 0);
  assert.equal(normalized.overall, 66);
});

test('score normalization rejects malformed provider output instead of storing NaN', () => {
  assert.throws(() => normalizeScore({
    technicalAccuracy: 80,
    structuralFlow: 80,
    communication: Number.NaN,
    confidence: 80,
    relevance: 80,
  }, { spoken: true }), /invalid communication score/);
});

test('session headline score equals its displayed overall percentage', () => {
  const result = aggregate([
    { overall: 80, technicalAccuracy: 100, structuralFlow: 40, communication: 80, confidence: 70, relevance: 90 },
    { overall: 60, technicalAccuracy: 40, structuralFlow: 80, communication: 60, confidence: 50, relevance: 30 },
  ]);
  assert.equal(result.overallScore, 70);
  assert.equal(result.overallPercentage, result.overallScore);
  assert.deepEqual(result.weightedScores, {
    knowledge: 70,
    communication: 70,
    behavioral: 60,
    interviewPerformance: 60,
  });
});

test('free plan exposes remaining monthly sessions accurately', () => {
  const status = planStatus({
    freeUsageMonth: '2026-10',
    freeSessionsUsed: 2,
    subscriptionExpiresAt: null,
  }, new Date('2026-10-07T12:00:00.000Z'));
  assert.equal(status.freeSessionsUsed, 2);
  assert.equal(status.freeSessionsRemaining, 1);
});

test('free plan requires Premium after the third interview in the current month', () => {
  const status = planStatus({
    freeUsageMonth: '2026-10',
    freeSessionsUsed: 3,
    subscriptionExpiresAt: null,
  }, new Date('2026-10-07T12:00:00.000Z'));
  assert.equal(status.freeSessionsUsed, 3);
  assert.equal(status.freeSessionsRemaining, 0);
});

test('payment records require the payer number alongside provider and transaction ID', async () => {
  const payment = new Payment({
    user: new User()._id,
    provider: 'bkash',
    payerNumber: '01712345678',
    amount: 499,
    providerReference: 'TXN123456',
  });
  await assert.doesNotReject(() => payment.validate());

  const paymentWithoutPayerNumber = new Payment({
    user: new User()._id,
    provider: 'nagad',
    amount: 499,
    providerReference: 'TXN654321',
  });
  await assert.rejects(
    () => paymentWithoutPayerNumber.validate(),
    (error) => Boolean(error.errors.payerNumber)
  );
});

test('admin payment list always includes every pending request, beyond recent history limit', async () => {
  const originalFind = Payment.find;
  const pendingPayments = Array.from({ length: 205 }, (_, index) => ({
    _id: `pending-${index}`,
    status: 'pending',
    createdAt: new Date(Date.UTC(2026, 9, index + 1)),
  }));
  const recentPayments = [
    ...pendingPayments.slice(0, 199),
    { _id: 'approved-old', status: 'approved', createdAt: new Date('2026-09-01T00:00:00.000Z') },
  ];
  let result;

  const query = (payments) => ({
    populate() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean() { return Promise.resolve(payments); },
  });
  Payment.find = (filter) => query(filter?.status === 'pending' ? pendingPayments : recentPayments);

  try {
    await adminController.listPayments({}, {
      json(body) {
        result = body;
      },
    }, (error) => {
      throw error;
    });
    assert.equal(result.payments.length, 206);
    assert.equal(result.payments.filter((payment) => payment.status === 'pending').length, 205);
    assert.ok(result.payments.some((payment) => payment._id === 'approved-old'));
  } finally {
    Payment.find = originalFind;
  }
});

test('admin approval activates the payment owner’s selected Premium plan', async () => {
  const originalFindOneAndUpdate = Payment.findOneAndUpdate;
  const originalFindById = User.findById;
  const payment = { _id: 'pending-payment', user: 'payment-owner', plan: 'yearly' };
  const user = {
    subscriptionExpiresAt: null,
    async save() {},
  };
  let responseBody;

  Payment.findOneAndUpdate = async (filter) => {
    assert.deepEqual(filter, { _id: 'pending-payment', status: 'pending' });
    return payment;
  };
  User.findById = async (id) => {
    assert.equal(id, payment.user);
    return user;
  };

  try {
    await adminController.reviewPayment({
      params: { id: payment._id },
      body: { status: 'approved' },
      user: { _id: 'admin-user' },
    }, {
      json(body) {
        responseBody = body;
      },
    }, (error) => {
      throw error;
    });
    assert.equal(responseBody.payment, payment);
    assert.ok(user.subscriptionExpiresAt instanceof Date);
    assert.ok(user.subscriptionExpiresAt.getTime() > Date.now() + 364 * 24 * 60 * 60 * 1000);
  } finally {
    Payment.findOneAndUpdate = originalFindOneAndUpdate;
    User.findById = originalFindById;
  }
});

test('user records expose a nullable last-login timestamp', () => {
  const user = new User({ name: 'Test User', email: 'test@example.com' });
  assert.equal(user.lastLoginAt, null);
  user.lastLoginAt = new Date('2026-10-09T07:00:00.000Z');
  assert.equal(user.lastLoginAt.toISOString(), '2026-10-09T07:00:00.000Z');
});

test('interview setup parses adaptive difficulty from multipart form values', () => {
  const base = {
    purpose: 'Job Interview',
    difficulty: 'Intermediate',
    level: 'Mid-Level',
    duration: '15 Mins',
    questions: '10 Questions',
    mode: 'Text Response',
  };

  assert.equal(parseSetup({ ...base, adaptiveDifficulty: 'true' }).value.adaptiveDifficulty, true);
  assert.equal(parseSetup({ ...base, adaptiveDifficulty: 'false' }).value.adaptiveDifficulty, false);
  assert.match(parseSetup({ ...base, adaptiveDifficulty: 'yes' }).error, /Adaptive difficulty must be true or false/);
});

test('premium is active only before its expiry time', () => {
  const now = new Date('2026-10-07T12:00:00.000Z');
  assert.equal(hasActivePremium({ subscriptionExpiresAt: new Date('2026-10-08T12:00:00.000Z') }, now), true);
  assert.equal(hasActivePremium({ subscriptionExpiresAt: new Date('2026-10-07T12:00:00.000Z') }, now), false);
});

test('all wallet instructions use the configured shared recipient number', () => {
  assert.deepEqual(paymentMerchantAccounts(), {
    bkash: '01786033697',
    nagad: '01786033697',
    rocket: '01786033697',
  });
  assert.equal(isPaymentMethodConfigured('bkash'), true);
  assert.equal(isPaymentMethodConfigured('nagad'), true);
  assert.equal(isPaymentMethodConfigured('rocket'), true);
  assert.equal(isPaymentMethodConfigured('unknown'), false);
});

test('email-change OTPs use independent attempts and are single-use', async () => {
  const user = {};
  const code = await issueOtp(user, 'emailChange');
  assert.equal(user.emailChangeOtpAttempts, 0);
  assert.equal((await verifyOtp(user, '000000', 'emailChange')).ok, false);
  assert.equal(user.emailChangeOtpAttempts, 1);
  assert.equal((await verifyOtp(user, code, 'emailChange')).ok, true);
  assert.equal(user.emailChangeOtpHash, null);

  const signupUser = {};
  const signupCode = await issueOtp(signupUser);
  assert.equal((await verifyOtp(signupUser, signupCode)).ok, true);
});

test('password reset OTPs are purpose-scoped and single-use', async () => {
  const user = {};
  const code = await issueOtp(user, 'passwordReset');

  assert.equal(user.passwordResetOtpAttempts, 0);
  assert.equal((await verifyOtp(user, '000000', 'passwordReset')).ok, false);
  assert.equal(user.passwordResetOtpAttempts, 1);
  assert.equal((await verifyOtp(user, code)).ok, false);
  assert.equal((await verifyOtp(user, code, 'passwordReset', { consume: false })).ok, true);
  assert.ok(user.passwordResetOtpHash);
  assert.equal((await verifyOtp(user, code, 'passwordReset')).ok, true);
  assert.equal(user.passwordResetOtpHash, null);
});

test('admin authorization returns an actionable code for non-admin accounts', async () => {
  const previous = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = 'configured-admin@example.com';
  let statusCode;
  let responseBody;

  try {
    const response = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    await requireAdmin({
      user: { email: 'regular-user@example.com', role: 'user' },
    }, response, () => {
      assert.fail('A non-admin account must not be authorized');
    });

    assert.equal(statusCode, 403);
    assert.equal(responseBody.code, 'ADMIN_REQUIRED');
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previous;
  }
});

test('configured admin email is promoted and authorized case-insensitively', async () => {
  const previousEmail = process.env.ADMIN_EMAILS;
  const previousUpdateOne = User.updateOne;
  process.env.ADMIN_EMAILS = ' InterviewMate.Admin@example.com ';
  let nextCalled = false;
  User.updateOne = async () => ({ acknowledged: true, modifiedCount: 1 });

  try {
    const req = { user: { email: 'interviewmate.admin@example.com', role: 'user' } };
    const res = {
      status(code) {
        assert.fail(`Expected admin access, received HTTP ${code}`);
      },
    };

    await requireAdmin(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.role, 'admin');
  } finally {
    User.updateOne = previousUpdateOne;
    if (previousEmail === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousEmail;
  }
});
