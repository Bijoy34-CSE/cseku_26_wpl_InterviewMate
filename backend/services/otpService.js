/**
 * OTP generation and verification.
 *
 * The plaintext OTP only ever exists in memory long enough to be emailed -
 * what's stored on the user document is a bcrypt hash, so a database leak
 * doesn't hand out working codes. Codes are single-use, time-limited, and
 * rate-limited by both resend cooldown and a maximum attempt count.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

/** Cryptographically secure 6-digit code (no modulo bias). */
function generateOtp() {
  const max = 10 ** OTP_LENGTH;
  let value;
  do {
    value = crypto.randomBytes(4).readUInt32BE(0);
  } while (value >= Math.floor(0xffffffff / max) * max);
  return String(value % max).padStart(OTP_LENGTH, '0');
}

async function hashOtp(otp) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}

/**
 * Stamps a fresh OTP onto the user document (does not save).
 * @returns {Promise<string>} the plaintext OTP, for emailing only
 */
async function issueOtp(user) {
  const otp = generateOtp();
  user.otpHash = await hashOtp(otp);
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  return otp;
}

/** Seconds a caller must still wait before another resend is allowed (0 = ok). */
function resendCooldownRemaining(user) {
  if (!user.otpLastSentAt) return 0;
  const elapsed = (Date.now() - new Date(user.otpLastSentAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
}

/**
 * Checks a submitted code against the stored hash.
 * Mutates attempt counters / clears the OTP on success (does not save).
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
async function verifyOtp(user, submittedOtp) {
  if (!user.otpHash || !user.otpExpiresAt) {
    return { ok: false, reason: 'No verification code is pending. Please request a new one.' };
  }

  if (new Date() > new Date(user.otpExpiresAt)) {
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    return { ok: false, reason: 'This verification code has expired. Please request a new one.' };
  }

  if (user.otpAttempts >= MAX_ATTEMPTS) {
    user.otpHash = null;
    user.otpExpiresAt = null;
    return { ok: false, reason: 'Too many incorrect attempts. Please request a new code.' };
  }

  const matches = await bcrypt.compare(String(submittedOtp).trim(), user.otpHash);
  if (!matches) {
    user.otpAttempts += 1;
    const left = Math.max(0, MAX_ATTEMPTS - user.otpAttempts);
    return {
      ok: false,
      reason: left > 0
        ? `Incorrect verification code. ${left} attempt${left === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new code.',
    };
  }

  // Single use: burn the code on success.
  user.otpHash = null;
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  return { ok: true };
}

module.exports = {
  issueOtp,
  verifyOtp,
  resendCooldownRemaining,
  OTP_TTL_MINUTES,
  RESEND_COOLDOWN_SECONDS,
  MAX_ATTEMPTS,
};
