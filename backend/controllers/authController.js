const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const oauthService = require('../services/oauthService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Permissive international format: optional +, 7-15 digits, spaces/dashes ok.
const MOBILE_REGEX = /^\+?[\d\s-]{7,20}$/;

const generateToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  firstName: user.firstName,
  middleName: user.middleName,
  lastName: user.lastName,
  email: user.email,
  mobile: user.mobile,
  university: user.university,
  isVerified: user.isVerified,
  provider: user.provider,
  avatarUrl: user.avatarUrl,
});

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Signup (step 1): create an unverified user and email them an OTP
// ---------------------------------------------------------------------------
exports.register = async (req, res) => {
  try {
    let { firstName, middleName, lastName, name, email, mobile, university, password, confirmPassword } = req.body;

    firstName = String(firstName || '').trim();
    middleName = String(middleName || '').trim();
    lastName = String(lastName || '').trim();
    email = String(email || '').trim().toLowerCase();
    mobile = String(mobile || '').trim();
    university = String(university || '').trim();

    // `name` is still accepted so older clients keep working; if only a single
    // name was sent, split it into parts.
    if (!firstName && name) {
      const parts = String(name).trim().split(/\s+/).filter(Boolean);
      firstName = parts[0] || '';
      lastName = parts.length > 1 ? parts[parts.length - 1] : '';
      middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    }

    if (!firstName) return res.status(400).json({ message: 'First name is required', field: 'firstName' });
    if (!lastName) return res.status(400).json({ message: 'Last name is required', field: 'lastName' });
    if (!email) return res.status(400).json({ message: 'Email is required', field: 'email' });
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address', field: 'email' });
    }
    if (mobile && !MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({ message: 'Please provide a valid mobile number', field: 'mobile' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long', field: 'password' });
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one letter and one number', field: 'password' });
    }
    if (confirmPassword !== undefined && confirmPassword !== password) {
      return res.status(400).json({ message: 'Passwords do not match', field: 'confirmPassword' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // An abandoned, never-verified signup can be retried rather than blocked.
      if (!existingUser.isVerified && existingUser.provider === 'local') {
        const cooldown = otpService.resendCooldownRemaining(existingUser);
        if (cooldown > 0) {
          return res.status(429).json({
            message: `A code was just sent. Please wait ${cooldown}s before requesting another.`,
            retryAfter: cooldown,
          });
        }
      } else {
        return res.status(400).json({ message: 'An account with this email already exists', field: 'email' });
      }
    }

    if (!emailService.isConfigured()) {
      return res.status(503).json({
        message:
          'Email delivery is not configured on the server, so a verification code cannot be sent. ' +
          `Missing: ${emailService.missingVars().join(', ')}.`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const fullName = User.buildFullName(firstName, middleName, lastName);

    const user = existingUser || new User({ email });
    user.name = fullName;
    user.firstName = firstName;
    user.middleName = middleName;
    user.lastName = lastName;
    user.mobile = mobile;
    user.university = university;
    user.password = hashedPassword;
    user.provider = 'local';
    user.isVerified = false;

    const otp = await otpService.issueOtp(user);

    try {
      await emailService.sendVerificationEmail(user.email, otp, otpService.OTP_TTL_MINUTES);
    } catch (mailError) {
      console.error('[auth] verification email failed:', mailError.message);
      return res.status(502).json({ message: 'We could not send the verification email. Please try again shortly.' });
    }

    // Only persist once the email actually went out.
    await user.save();

    res.status(201).json({
      message: 'Verification code sent',
      requiresVerification: true,
      email: user.email,
      expiresInMinutes: otpService.OTP_TTL_MINUTES,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account with this email already exists', field: 'email' });
    }
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// Signup (step 2): verify the emailed OTP and issue the auth token
// ---------------------------------------------------------------------------
exports.verifyOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();

    if (!email || !otp) return res.status(400).json({ message: 'Email and verification code are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No pending registration found for this email' });
    if (user.isVerified) return res.status(400).json({ message: 'This account is already verified. Please log in.' });

    const result = await otpService.verifyOtp(user, otp);
    await user.save();

    if (!result.ok) return res.status(400).json({ message: result.reason });

    user.isVerified = true;
    await user.save();

    res.status(200).json({ token: generateToken(user._id), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// Resend the verification OTP (rate limited)
// ---------------------------------------------------------------------------
exports.resendOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No pending registration found for this email' });
    if (user.isVerified) return res.status(400).json({ message: 'This account is already verified. Please log in.' });

    const cooldown = otpService.resendCooldownRemaining(user);
    if (cooldown > 0) {
      return res.status(429).json({ message: `Please wait ${cooldown}s before requesting another code.`, retryAfter: cooldown });
    }

    if (!emailService.isConfigured()) {
      return res.status(503).json({
        message: `Email delivery is not configured on the server. Missing: ${emailService.missingVars().join(', ')}.`,
      });
    }

    const otp = await otpService.issueOtp(user);
    try {
      await emailService.sendVerificationEmail(user.email, otp, otpService.OTP_TTL_MINUTES);
    } catch (mailError) {
      console.error('[auth] resend verification email failed:', mailError.message);
      return res.status(502).json({ message: 'We could not send the verification email. Please try again shortly.' });
    }
    await user.save();

    res.status(200).json({
      message: 'Verification code sent',
      expiresInMinutes: otpService.OTP_TTL_MINUTES,
      cooldownSeconds: otpService.RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
exports.login = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    // Account created through Google/GitHub has no local password set.
    if (!user.password) {
      return res.status(400).json({
        message: `This account was created with ${user.provider === 'github' ? 'GitHub' : 'Google'}. Please use that sign-in option.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email address to continue.',
        requiresVerification: true,
        email: user.email,
      });
    }

    res.json({ token: generateToken(user._id), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.status(200).json({ user: publicUser(req.user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
};

// ---------------------------------------------------------------------------
// OAuth: start (redirect to provider) and callback (exchange + issue token)
// ---------------------------------------------------------------------------
exports.oauthStart = (provider) => (req, res) => {
  try {
    if (!oauthService.isConfigured(provider)) {
      const missing = oauthService.missingVars(provider).join(', ');
      return res.redirect(
        `${FRONTEND_URL()}/login?error=${encodeURIComponent(
          `${provider === 'github' ? 'GitHub' : 'Google'} sign-in is not configured on the server (missing ${missing}).`
        )}`
      );
    }

    const state = oauthService.createState();
    // Short-lived, httpOnly cookie so the callback can confirm the state it
    // gets back is one we actually issued (CSRF protection).
    res.cookie(`oauth_state_${provider}`, state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    res.redirect(oauthService.buildAuthorizeUrl(provider, state));
  } catch (error) {
    res.redirect(`${FRONTEND_URL()}/login?error=${encodeURIComponent(error.message)}`);
  }
};

exports.oauthCallback = (provider) => async (req, res) => {
  const fail = (message) =>
    res.redirect(`${FRONTEND_URL()}/login?error=${encodeURIComponent(message)}`);

  try {
    const { code, state, error: providerError } = req.query;

    if (providerError) return fail(`${provider} sign-in was cancelled or denied.`);
    if (!code) return fail('No authorization code was returned.');

    const expectedState = req.cookies?.[`oauth_state_${provider}`];
    if (!expectedState || !state || state !== expectedState) {
      return fail('Sign-in session expired or was invalid. Please try again.');
    }
    res.clearCookie(`oauth_state_${provider}`);

    const accessToken = await oauthService.exchangeCodeForToken(provider, code);
    const profile = await oauthService.fetchProfile(provider, accessToken);

    // Link by provider id first, then fall back to email so a user who
    // originally signed up locally can also sign in with the same address.
    let user = await User.findOne({ provider, providerId: profile.providerId });
    if (!user) user = await User.findOne({ email: profile.email });

    if (!user) {
      user = new User({
        name: profile.fullName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        provider,
        providerId: profile.providerId,
        avatarUrl: profile.avatarUrl,
        isVerified: true, // the provider already verified this address
      });
    } else {
      if (!user.providerId) {
        user.provider = provider;
        user.providerId = profile.providerId;
      }
      if (!user.avatarUrl && profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
      user.isVerified = true;
    }

    await user.save();

    const token = generateToken(user._id);
    // Handed to the frontend callback route, which stores it and redirects.
    res.redirect(`${FRONTEND_URL()}/oauth/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error(`[auth] ${provider} OAuth failed:`, error.message);
    fail(`${provider === 'github' ? 'GitHub' : 'Google'} sign-in failed. Please try again.`);
  }
};

// Lets the frontend hide/disable buttons for providers that aren't set up.
exports.authConfig = (req, res) => {
  res.status(200).json({
    google: oauthService.isConfigured('google'),
    github: oauthService.isConfigured('github'),
    email: emailService.isConfigured(),
  });
};
