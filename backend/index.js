const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const siteFeedbackRoutes = require('./routes/siteFeedbackRoutes');
const aiService = require('./services/aiService');
const emailService = require('./services/emailService');
const oauthService = require('./services/oauthService');

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // needed for the short-lived OAuth state cookie
  })
);
app.use(express.json());
app.use(cookieParser());

// Database Connection (single shared connection - see config/db.js)
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/site-feedback', siteFeedbackRoutes);

app.get('/', (req, res) => {
  res.send('InterviewMate API Status: Running');
});

// Central error handler - keeps internal details out of client responses.
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  const providers = aiService.getConfiguredProviderNames();
  console.log(
    providers.length > 0
      ? `AI provider: ${providers.join(' -> ')} (falls back to the built-in heuristic if a call fails)`
      : 'AI provider: none configured - using the built-in fallback heuristic. Set GEMINI_API_KEY in backend/.env for real AI.'
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
