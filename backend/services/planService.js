const FREE_MONTHLY_SESSIONS = 3;
const configuredMonthlyPrice = Number(process.env.PREMIUM_MONTHLY_PRICE_BDT);
const MONTHLY_PREMIUM_PRICE_BDT =
  Number.isInteger(configuredMonthlyPrice) && configuredMonthlyPrice > 0 && configuredMonthlyPrice <= 100000
    ? configuredMonthlyPrice
    : 499;
const configuredYearlyPrice = Number(process.env.PREMIUM_YEARLY_PRICE_BDT);
const YEARLY_PREMIUM_PRICE_BDT =
  Number.isInteger(configuredYearlyPrice) && configuredYearlyPrice > 0 && configuredYearlyPrice <= 100000
    ? configuredYearlyPrice
    : 2999;
const PREMIUM_PLAN_DAYS = { monthly: 30, yearly: 365 };
const DEFAULT_MERCHANT_NUMBER = '01786033697';
const PAYMENT_PROVIDERS = ['bkash', 'nagad', 'rocket'];
const User = require('../models/User');

function paymentMerchantAccounts() {
  return Object.fromEntries(
    PAYMENT_PROVIDERS.map((provider) => [provider, DEFAULT_MERCHANT_NUMBER])
  );
}

function isPaymentMethodConfigured(provider) {
  return PAYMENT_PROVIDERS.includes(provider);
}

function premiumPrice(plan) {
  if (plan === 'monthly') return MONTHLY_PREMIUM_PRICE_BDT;
  if (plan === 'yearly') return YEARLY_PREMIUM_PRICE_BDT;
  return null;
}

function currentUsageMonth(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function hasActivePremium(user, now = new Date()) {
  if (user.role === 'admin') return true;
  return Boolean(user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now);
}

function planStatus(user, now = new Date()) {
  const month = currentUsageMonth(now);
  const used = user.freeUsageMonth === month ? user.freeSessionsUsed || 0 : 0;
  const premium = hasActivePremium(user, now);
  return {
    plan: premium ? 'premium' : 'free',
    isUnlimited: user.role === 'admin',
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    monthlyPriceBdt: MONTHLY_PREMIUM_PRICE_BDT,
    yearlyPriceBdt: YEARLY_PREMIUM_PRICE_BDT,
    freeSessionsUsed: used,
    freeSessionsLimit: FREE_MONTHLY_SESSIONS,
    freeSessionsRemaining: premium ? null : Math.max(0, FREE_MONTHLY_SESSIONS - used),
    month,
  };
}

async function reserveInterview(userId, now = new Date()) {
  const month = currentUsageMonth(now);
  return User.findOneAndUpdate(
    {
      _id: userId,
      $expr: {
        $or: [
          { $eq: ['$role', 'admin'] },
          { $gt: [{ $ifNull: ['$subscriptionExpiresAt', new Date(0)] }, now] },
          { $ne: [{ $ifNull: ['$freeUsageMonth', ''] }, month] },
          { $lt: [{ $ifNull: ['$freeSessionsUsed', 0] }, FREE_MONTHLY_SESSIONS] },
        ],
      },
    },
    [
      {
        $set: {
          freeUsageMonth: {
            $cond: [
              { $eq: ['$role', 'admin'] },
              { $ifNull: ['$freeUsageMonth', ''] },
              month,
            ],
          },
          freeSessionsUsed: {
            $cond: [
              { $eq: ['$role', 'admin'] },
              { $ifNull: ['$freeSessionsUsed', 0] },
              {
                $cond: [
                  { $gt: [{ $ifNull: ['$subscriptionExpiresAt', new Date(0)] }, now] },
                  { $ifNull: ['$freeSessionsUsed', 0] },
                  {
                    $cond: [
                      { $eq: [{ $ifNull: ['$freeUsageMonth', ''] }, month] },
                      { $add: [{ $ifNull: ['$freeSessionsUsed', 0] }, 1] },
                      1,
                    ],
                  },
                ],
              }
            ],
          },
        },
      },
    ],
    { new: true, updatePipeline: true }
  );
}

async function releaseInterview(userId, wasPremium, now = new Date()) {
  if (wasPremium) return;
  await User.updateOne(
    { _id: userId, freeUsageMonth: currentUsageMonth(now), freeSessionsUsed: { $gt: 0 } },
    { $inc: { freeSessionsUsed: -1 } }
  );
}

module.exports = {
  FREE_MONTHLY_SESSIONS,
  MONTHLY_PREMIUM_PRICE_BDT,
  YEARLY_PREMIUM_PRICE_BDT,
  PREMIUM_PLAN_DAYS,
  paymentMerchantAccounts,
  isPaymentMethodConfigured,
  premiumPrice,
  currentUsageMonth,
  hasActivePremium,
  planStatus,
  reserveInterview,
  releaseInterview,
};
