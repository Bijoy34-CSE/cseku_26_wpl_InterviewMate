# InterviewMate

AI-powered interview and viva preparation. Upload your own resume, syllabus or
slides, and InterviewMate generates interview questions from that actual
document — then scores your answers and adapts the next question to how you did.

```
InterviewMate/
├── frontend/   React 19 + Vite + Tailwind (installable PWA)
└── backend/    Node + Express + MongoDB
```

## Features

- Email/password signup with **real emailed OTP verification** (6-digit, hashed, expiring, single-use) and OTP-based password reset
- Google and GitHub sign-in via real OAuth 2.0 (secrets stay server-side)
- JWT auth with refresh-safe persistence and protected routes
- Document upload (**PDF, DOCX, PPTX**) with text extraction; PDFs are sent to Gemini natively (diagrams, charts and tables included) and any images embedded in DOCX/PPTX files are extracted and analysed too
- Gemini-generated questions driven by your full interview configuration
- Adaptive engine: each question factors in your previous answers, scores and feedback
- Per-answer scoring plus end-of-session feedback, all persisted to MongoDB
- Strict per-user data isolation — every query is scoped to the authenticated user
- Three free mock-interview sessions per UTC calendar month, enforced on the server
- Monthly Premium (default ৳499 for 30 days) and Yearly Premium (default ৳2,999 for 365 days), with payment-reference review and activation by a configured admin
- Admin workspace for account access, interview activity, curated practice questions, feedback and payment review
- Installable PWA with a privacy-safe service worker

## Tech stack

**Frontend:** React 19, Vite, React Router, Tailwind CSS v4, Recharts, Axios, Lucide icons
**Backend:** Node.js, Express 5, MongoDB/Mongoose, JWT, bcryptjs, Multer, Nodemailer
**AI:** Google Gemini (primary), Anthropic Claude (optional secondary), deterministic non-AI fallback
**Parsing:** pdf-parse, mammoth (DOCX), JSZip (PPTX)

## Requirements

- Node.js 20.19.x or 22.12+ (required by Vite 8 and Mongoose 9)
- A MongoDB database (local or Atlas)
- A Gemini API key (for real AI)
- An SMTP account (for signup OTP emails)

## Backend setup

```bash
cd backend
npm install
cp .env.example .env    # then fill in the values below (Windows: copy .env.example .env)
npm run dev             # or: npm start
```

Runs on `http://localhost:5000`. On boot it prints which AI provider, email and
OAuth providers are configured, so you can confirm your `.env` was picked up.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API port (default 5000) |
| `FRONTEND_URL` | No | React app origin, for CORS + OAuth redirects (default `http://localhost:5173`) |
| `BACKEND_URL` | No | This server's public URL, used for default OAuth callbacks |
| `CORS_ALLOWED_ORIGINS` | No | Extra browser/app origins allowed to call the API, comma-separated (e.g. `https://localhost,capacitor://localhost` for a Capacitor mobile app, or your desktop app's origin). `FRONTEND_URL` is always allowed |
| `TRUST_PROXY` | No | Set to `1` when the API runs behind one reverse proxy / load balancer, so rate limits use the real client IP |
| `MONGO_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Long random string used to sign auth tokens |
| `GEMINI_API_KEY` | For real AI | Enables Gemini question generation and answer evaluation |
| `GEMINI_MODEL` | No | Optional override (default `gemini-2.5-flash`) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | No | Optional secondary AI provider |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` | For signup and password reset | SMTP credentials for OTP delivery |
| `EMAIL_FROM` | No | From address (defaults to `EMAIL_USER`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | For Google login | Google OAuth credentials |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_CALLBACK_URL` | For GitHub login | GitHub OAuth credentials |
| `ADMIN_EMAILS` | For admin access | Comma-separated, exact account email addresses to grant administrator access |
| `PREMIUM_MONTHLY_PRICE_BDT` | No | Monthly Premium price in BDT (default ৳499; 1–100,000) |
| `PREMIUM_YEARLY_PRICE_BDT` | No | Yearly Premium price in BDT (default ৳2,999; 1–100,000) |
| `BKASH_MERCHANT_NUMBER` | For bKash payment instructions | Verified InterviewMate merchant wallet number |
| `NAGAD_MERCHANT_NUMBER` | For Nagad payment instructions | Verified InterviewMate merchant wallet number |
| `ROCKET_MERCHANT_NUMBER` | For Rocket payment instructions | Verified InterviewMate merchant wallet number |

### Free sessions, Premium and administration

- Each account can start **three mock interview sessions per UTC calendar month**. A session is reserved when it is successfully created; failed AI startup releases the reservation. Deleting history does not reset the monthly allowance.
- Premium is activated only after an administrator reviews a submitted wallet transaction reference and approves it. Monthly approval grants 30 days; yearly approval grants 365 days, each from the later of now or the current expiry.
- The Premium page opens a **Payment Process** panel with bKash, Nagad, and Rocket choices. A wallet is selectable only when its verified merchant number is configured; the backend independently rejects payment requests for unconfigured methods.
- The current wallet checkout is **manual verification**, not a direct bKash/Nagad/Rocket API checkout. Configure only merchant numbers you control. The customer submits the official receipt transaction ID, and Premium remains inactive until an administrator verifies it. Do not describe this as automatic confirmation.
- Add your verified admin account email to `ADMIN_EMAILS` (it must exactly match the account you sign in with), restart the backend, sign out and back in, then open `/admin`. If access is denied, the admin page identifies the signed-in account to compare. Admin APIs enforce roles server-side; hiding the link is not the access control.
- Admins can review payment references against their merchant portal, approve/reject requests, manage user access, publish/hide curated questions, and review product feedback and interview metadata. Candidate uploaded documents and answer text are not included in the admin interview listing.

### MongoDB setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), or run MongoDB locally.
2. Create a database user and allow access from your IP.
3. Put the connection string in `MONGO_URI`.

### Gemini setup

1. Create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Set `GEMINI_API_KEY` in `backend/.env`. `GEMINI_MODEL` is optional.
3. The key is read only on the backend and is never sent to the browser.

Without a key, the app still runs but every generated question/score is marked
`source: "fallback"` — it is never presented as real AI output.

Adaptive mock interviews require an uploaded document and validate generated
questions against it. Answer scores are normalized to a reproducible 0–100
scale (equal-weight technical accuracy, structure, communication, delivery,
and relevance; typed answers use communication for delivery). AI judgments are
not guaranteed to be perfectly accurate; review the cited document evidence
and suggested answer, especially for specialized subject matter.

### Email / OTP setup (Gmail example)

1. Enable 2-Step Verification on the Google account.
2. Create an **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — never use your normal password.
3. Set `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, `EMAIL_USER=<your address>`, `EMAIL_PASSWORD=<app password>`.

Any SMTP provider (SendGrid, Mailgun, Postmark…) works — just supply its host,
port and credentials. If email isn't configured, signup fails with a clear
configuration error instead of silently pretending a code was sent.

### Google OAuth setup

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** of type *Web application*.
3. Add authorised redirect URI: `http://localhost:5000/api/auth/google/callback`.
4. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL` to `backend/.env`. Use `backend/oauth-payment.env.example` as a reference; never put the client secret in frontend variables or source control.
5. Restart the backend. The Google sign-in buttons become available only when the server confirms that both OAuth credentials are configured.

For deployment, set the production frontend/backend origins and register the exact production callback URL in Google Cloud Console. Localhost callback URLs will not work for the deployed site.

### GitHub OAuth setup

1. Go to [GitHub → Developer settings → OAuth Apps](https://github.com/settings/developers) → **New OAuth App**.
2. Homepage URL: `http://localhost:5173`.
3. Authorization callback URL: `http://localhost:5000/api/auth/github/callback`.
4. Copy the client ID and a generated client secret into `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.

Buttons for a provider stay disabled until its credentials are present, so a
user never clicks a sign-in option that cannot work.

## Frontend setup

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

In `npm run dev` the frontend talks to `http://localhost:5000`. For any other
build (production website, desktop app, mobile app) set the API's public URL
before building - copy `frontend/.env.example` to `frontend/.env.production`:

```bash
VITE_API_ORIGIN=https://api.your-domain.com   # no trailing slash, no /api
```

If it is left empty, a production web build assumes the API is served from the
same origin as the website (for example behind a reverse proxy).

## Deployment checklist (website)

1. **Backend** (Render / Railway / VPS): set the variables from `backend/.env.example`
   - `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL` (your website),
     `BACKEND_URL` (your API), `TRUST_PROXY=1`, SMTP and AI keys. Serve it over HTTPS.
   - Health check URL: `GET /api/health` (200 = running and connected to MongoDB).
2. **Frontend** (Vercel / Netlify / Cloudflare Pages): build with `VITE_API_ORIGIN` set.
   Single-page-app rewrites are included (`public/_redirects` for Netlify/Cloudflare,
   `vercel.json` for Vercel) so refreshing `/dashboard` doesn't 404.
3. **OAuth**: register the production callback URLs
   (`https://api.your-domain.com/api/auth/google/callback`, `.../github/callback`)
   and set `GOOGLE_CALLBACK_URL` / `GITHUB_CALLBACK_URL` to match.
4. **MongoDB Atlas**: allow your server's IP address.
5. Camera/microphone only work on HTTPS (or `localhost`), so always test voice/video
   interviews over HTTPS.

## Security notes

- Public auth endpoints (login, signup, OTP, password reset) are rate-limited
  per IP and per IP + email; failed attempts count, successful logins do not.
  Counters live in server memory - if you run several server instances, move
  the limiter to a shared store such as Redis.
- API responses are sent with `Cache-Control: no-store` and standard security headers.
- CORS only accepts `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS`.
- Never commit or share `backend/.env`; rotate any key that has been shared.

## PWA installation

Build and serve the frontend over HTTPS (or `localhost`) and the app is
installable:

- **Chrome/Edge (desktop):** click the install icon in the address bar, or the **Install App** button in the landing page header.
- **Android (Chrome):** menu → *Add to Home screen*.
- **iPhone/iPad (Safari):** Share → *Add to Home Screen*.

The service worker caches only the static app shell. API responses, interview
answers, documents and auth tokens are **never** cached.

## AI interview flow

```
Sign up → OTP emailed → verify → Dashboard
   → Set Up Your AI Evaluation (purpose, type, difficulty, level,
     duration, question count, mode, materials)
   → Upload PDF / DOCX / PPTX
   → Text extracted; PDFs also sent to Gemini natively (diagrams + charts);
     images embedded in DOCX/PPTX are extracted and analysed too
   → Gemini generates question 1 from your document + your configuration
   → Answer → Gemini scores it (accuracy, structure, communication,
     confidence, relevance) and returns feedback
   → Adaptive engine adjusts difficulty; next question factors in your
     previous questions, answers, scores and feedback
   → Repeat for the selected question count
   → Session completes → overall score + feedback saved to MongoDB
   → Dashboard, Profile and Analytics show only your own data
```
