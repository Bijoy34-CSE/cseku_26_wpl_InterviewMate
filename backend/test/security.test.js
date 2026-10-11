const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { rateLimit, buildAllowedOrigins, corsOptions, ipAndEmailKey, normalizeOrigin } = require('../middleware/security');

function fakeRes() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.body = null;
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('rate limiter blocks after max hits and returns a Retry-After header', () => {
  const limiter = rateLimit({ windowMs: 60000, max: 2, message: 'slow down' });
  const req = { ip: '1.2.3.4' };
  let passed = 0;
  for (let i = 0; i < 3; i += 1) {
    const res = fakeRes();
    limiter(req, res, () => { passed += 1; });
    if (i === 2) {
      assert.equal(res.statusCode, 429);
      assert.equal(res.body.message, 'slow down');
      assert.ok(Number(res.headers['Retry-After']) >= 1);
    }
  }
  assert.equal(passed, 2);
});

test('rate limiter keeps separate counters per key', () => {
  const limiter = rateLimit({ windowMs: 60000, max: 1 });
  let passed = 0;
  limiter({ ip: 'a' }, fakeRes(), () => { passed += 1; });
  limiter({ ip: 'b' }, fakeRes(), () => { passed += 1; });
  assert.equal(passed, 2);
});

test('successful requests are not counted when skipSuccessful is on', () => {
  const limiter = rateLimit({ windowMs: 60000, max: 1, skipSuccessful: true });
  const req = { ip: 'x' };
  let passed = 0;
  for (let i = 0; i < 5; i += 1) {
    const res = fakeRes();
    limiter(req, res, () => { passed += 1; });
    res.statusCode = 200;
    res.emit('finish');
  }
  assert.equal(passed, 5);

  // A failed attempt does count.
  const failing = rateLimit({ windowMs: 60000, max: 1, skipSuccessful: true });
  const res1 = fakeRes();
  failing(req, res1, () => {});
  res1.statusCode = 401;
  res1.emit('finish');
  const res2 = fakeRes();
  failing(req, res2, () => { throw new Error('should have been blocked'); });
  assert.equal(res2.statusCode, 429);
});

test('limiter key combines IP and lower-cased e-mail', () => {
  assert.equal(ipAndEmailKey({ ip: '9.9.9.9', body: { email: ' User@Example.com ' } }), '9.9.9.9|user@example.com');
  assert.equal(ipAndEmailKey({ ip: '9.9.9.9' }), '9.9.9.9|');
});

test('CORS allows FRONTEND_URL and CORS_ALLOWED_ORIGINS, blocks everything else', () => {
  const env = {
    FRONTEND_URL: 'https://app.example.com/',
    CORS_ALLOWED_ORIGINS: 'capacitor://localhost, https://localhost',
  };
  const allowed = buildAllowedOrigins(env);
  assert.ok(allowed.has('https://app.example.com'));
  assert.ok(allowed.has('capacitor://localhost'));
  assert.equal(normalizeOrigin('https://x.com///'), 'https://x.com');

  const { origin } = corsOptions(env);
  const check = (o) => { let r; origin(o, (_e, ok) => { r = ok; }); return r; };
  assert.equal(check('https://app.example.com'), true);
  assert.equal(check('https://localhost'), true);
  assert.equal(check(undefined), true);
  assert.equal(check('https://evil.example.org'), false);
});

test('defaults to the local Vite dev server when FRONTEND_URL is unset', () => {
  assert.ok(buildAllowedOrigins({}).has('http://localhost:5173'));
});
