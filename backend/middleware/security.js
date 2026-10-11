/**
 * Small, dependency-free security helpers: response headers, an in-memory
 * rate limiter and the CORS origin allow-list.
 *
 * The rate limiter keeps its counters in this process's memory. That is fine
 * for a single server instance; if you later run several instances behind a
 * load balancer, swap it for a shared store (e.g. Redis) so limits are global.
 */

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

/**
 * Origins allowed to call the API from a browser/WebView.
 * FRONTEND_URL is always allowed; CORS_ALLOWED_ORIGINS adds more
 * (comma-separated), e.g. the desktop app or Capacitor mobile app origins:
 *   CORS_ALLOWED_ORIGINS=https://localhost,capacitor://localhost,app://interviewmate
 */
function buildAllowedOrigins(env = process.env) {
  const list = [
    env.FRONTEND_URL || 'http://localhost:5173',
    ...String(env.CORS_ALLOWED_ORIGINS || '').split(','),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);
  return new Set(list);
}

function corsOptions(env = process.env) {
  const allowed = buildAllowedOrigins(env);
  return {
    // Requests with no Origin header (curl, server-to-server, same-origin) are allowed.
    origin(origin, callback) {
      if (!origin || allowed.has(normalizeOrigin(origin))) return callback(null, true);
      return callback(null, false); // no CORS headers => the browser blocks it
    },
    credentials: true, // needed for the short-lived OAuth state cookie
  };
}

/** Conservative headers for a JSON API. */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}

/** API responses can contain private data - never let browsers/proxies cache them. */
function noStore(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/**
 * Fixed-window rate limiter.
 * @param {object} options
 * @param {number} options.windowMs         window length in ms
 * @param {number} options.max              max counted requests per key per window
 * @param {string} [options.message]        error message returned with HTTP 429
 * @param {(req) => string} [options.keyFn] how to group requests (default: client IP)
 * @param {boolean} [options.skipSuccessful] don't count responses with status < 400
 *                                           (so correct logins never lock anyone out)
 */
function rateLimit({ windowMs, max, message, keyFn, skipSuccessful = false }) {
  const hits = new Map(); // key -> { count, resetAt }

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, Math.max(windowMs, 60 * 1000));
  if (typeof sweep.unref === 'function') sweep.unref(); // never keep the process alive

  const middleware = (req, res, next) => {
    const now = Date.now();
    const key = keyFn ? keyFn(req) : req.ip || 'unknown';

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message: message || 'Too many requests. Please wait a moment and try again.',
        retryAfterSeconds,
      });
    }

    entry.count += 1;

    if (skipSuccessful) {
      res.on('finish', () => {
        if (res.statusCode < 400 && entry.count > 0) entry.count -= 1;
      });
    }

    return next();
  };

  middleware.reset = () => hits.clear(); // used by tests
  return middleware;
}

/** Group by client IP + the e-mail in the body, so one noisy address can't lock out a whole shared network. */
const ipAndEmailKey = (req) =>
  `${req.ip || 'unknown'}|${String(req.body?.email || '').trim().toLowerCase()}`;

module.exports = {
  normalizeOrigin,
  buildAllowedOrigins,
  corsOptions,
  securityHeaders,
  noStore,
  rateLimit,
  ipAndEmailKey,
};
