const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const siteFeedbackRoutes = require('./routes/siteFeedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mongoose = require('mongoose');
const aiService = require('./services/aiService');
const { corsOptions, securityHeaders, noStore, rateLimit } = require('./middleware/security');
const emailService = require('./services/emailService');
const oauthService = require('./services/oauthService');

const app = express();

app.disable('x-powered-by');

// Behind a reverse proxy / load balancer (Render, Railway, Nginx, Cloudflare...)
// set TRUST_PROXY=1 so rate limiting sees the real client IP, not the proxy's.
if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(tp) ? Number(tp) : tp === 'true' ? 1 : tp);
}

// Middleware
app.use(securityHeaders);
// FRONTEND_URL plus any extra origins in CORS_ALLOWED_ORIGINS (web, desktop and mobile app).
app.use(cors(corsOptions()));
app.use(express.json());
app.use(cookieParser());

// API responses may hold private data: never cache them.
app.use('/api', noStore);

// Health check for hosting platforms / uptime monitors (no auth, no private data).
app.get('/api/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({ status: dbReady ? 'ok' : 'degraded', database: dbReady ? 'connected' : 'not connected' });
});

// A broad per-IP ceiling (generous, because many mobile users share one carrier IP);
// stricter limits sit on the sensitive auth routes themselves.
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 600,
    message: 'Too many requests from this network. Please wait a minute and try again.',
  })
);

// Database Connection (single shared connection - see config/db.js)
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/site-feedback', siteFeedbackRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('InterviewMate API Status: Running');
});

// Central error handler - keeps internal details out of client responses.
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON request body.' });
  }
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  const providers = aiService.getConfiguredProviderNames();
  console.log(
    providers.length > 0
      ? `AI providers (Mock Interview, in order): ${providers.join(' -> ')} - never falls back to the generic question bank`
      : 'AI provider (Mock Interview): none configured - Mock Interview will return a clear error until GEMINI_API_KEY is set (or Ollama is available)'
  );

  console.log(
    emailService.isConfigured()
      ? 'Email (OTP): configured'
      : `Email (OTP): NOT configured - signup will fail. Missing: ${emailService.missingVars().join(', ')}`
  );

  ['google', 'github'].forEach((p) => {
    console.log(
      oauthService.isConfigured(p)
        ? `${p} OAuth: configured`
        : `${p} OAuth: not configured (missing ${oauthService.missingVars(p).join(', ')})`
    );
  });
});
