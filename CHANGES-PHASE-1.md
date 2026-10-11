# Phase 1 changes (web fixes, PWA, security)

No `.env`, `node_modules` or `dist` included. Run `npm install` in `backend/` and `frontend/`.
Needs Node 20.19.x or 22.12+.

## Backend
- NEW  `backend/middleware/security.js` - security headers, no-store, in-memory rate limiter, CORS allow-list
- EDIT `backend/index.js` - uses the above; `TRUST_PROXY`; `GET /api/health`; `x-powered-by` off
- EDIT `backend/routes/authRoutes.js` - rate limits on login / register / OTP / password reset / OAuth
- EDIT `backend/controllers/authController.js` - trailing slash in `FRONTEND_URL` no longer breaks redirects
- NEW  `backend/.env.example`, `backend/.gitignore`
- NEW  `backend/test/security.test.js`
- FIX  `backend/test/accountFlows.test.js` - 4 tests were nested inside the first test and silently never ran; now all 25 tests run and pass

## Frontend
- EDIT `src/api.js` - no hard-coded localhost in production builds (`VITE_API_ORIGIN`, or same origin)
- EDIT `src/App.jsx` - lazy-loaded pages (main JS 940 KB -> 331 KB), reload-once recovery after redeploys, error screen instead of a blank page
- EDIT `public/manifest.webmanifest` - PNG icons (192, 512, maskable) added for Android/Chrome install
- EDIT `index.html` - PNG apple-touch-icon for iPhone
- EDIT `public/service-worker.js` - cache version bumped (v4)
- EDIT `src/index.css`, `src/components/Sidebar.jsx`, `src/components/views/MockInterview.jsx` - safe-area (notch) spacing on phones
- NEW  `.env.example`, `public/_redirects`, `vercel.json` (SPA rewrites)
- EDIT `.gitignore` - ignores `.env` files
- REMOVED (unused, no references): `src/assets/viva-image.png` (2.3 MB), `src/assets/hero.png`, `react.svg`, `vite.svg`, `src/App.css`

## Docs
- EDIT `README.md` - new env vars, deployment checklist, security notes

## Verified
- Backend: 25/25 tests pass; server booted with DB stubbed - health, CORS (allowed / blocked / preflight), headers and login rate limit (429 on the 11th failed try) checked
- Frontend: lint 0 errors (11 warnings, all in files this phase did not touch); production build OK
- NOT verified: real MongoDB, email, Gemini, OAuth and real phones/browsers - need your keys / devices
