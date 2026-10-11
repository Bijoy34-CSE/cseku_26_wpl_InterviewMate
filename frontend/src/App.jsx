import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Import User Provider Context
import { UserProvider } from './context/UserContext';
import ProtectedRoute from './components/ProtectedRoute';

// The landing page is the first thing most visitors see, so it ships in the
// main bundle. Every other screen is loaded on demand, which keeps the first
// download small on slow mobile connections.
import LandingPage from './components/views/LandingPage';

// After a new deployment the old hashed JS files disappear. If a lazy chunk
// fails to load, reload once to pick up the new build instead of a blank screen.
function lazyWithRetry(factory) {
  return lazy(async () => {
    const flag = 'im_chunk_reload';
    try {
      const mod = await factory();
      try { sessionStorage.removeItem(flag); } catch { /* storage unavailable */ }
      return mod;
    } catch (error) {
      let alreadyRetried = false;
      try { alreadyRetried = sessionStorage.getItem(flag) === '1'; } catch { /* storage unavailable */ }
      if (!alreadyRetried) {
        try { sessionStorage.setItem(flag, '1'); } catch { /* storage unavailable */ }
        window.location.reload();
        return new Promise(() => {}); // page is reloading
      }
      throw error;
    }
  });
}

const CareerAcademic = lazyWithRetry(() => import('./components/views/CareerAcademic'));
const Dashboard = lazyWithRetry(() => import('./components/views/Dashboard'));
const FeedbackResults = lazyWithRetry(() => import('./components/views/FeedbackResults'));
const InterviewCompleted = lazyWithRetry(() => import('./components/views/InterviewCompleted'));
const Login = lazyWithRetry(() => import('./components/views/Login'));
const MockInterview = lazyWithRetry(() => import('./components/views/MockInterview'));
const PerformanceAnalytics = lazyWithRetry(() => import('./components/views/PerformanceAnalytics'));
const PracticeQuestions = lazyWithRetry(() => import('./components/views/PracticeQuestions'));
const ProfileView = lazyWithRetry(() => import('./components/views/ProfileView'));
const SettingsView = lazyWithRetry(() => import('./components/views/SettingsView'));
const Signup = lazyWithRetry(() => import('./components/views/Signup'));
const VerifyEmail = lazyWithRetry(() => import('./components/views/VerifyEmail'));
const OAuthCallback = lazyWithRetry(() => import('./components/views/OAuthCallback'));
const StartInterview = lazyWithRetry(() => import('./components/views/StartInterview'));
const History = lazyWithRetry(() => import('./components/views/History'));
const Community = lazyWithRetry(() => import('./components/views/Community'));
const Help = lazyWithRetry(() => import('./components/views/Help'));
const Feedback = lazyWithRetry(() => import('./components/views/Feedback'));
const UpgradePlan = lazyWithRetry(() => import('./components/views/UpgradePlan'));
const AdminPanel = lazyWithRetry(() => import('./components/views/AdminPanel'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

// Last-resort screen so an unexpected render error never leaves a blank page.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('[ui] unexpected error:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <p className="text-base font-bold text-slate-800">Something went wrong while loading this page.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-[#5846F6] px-5 py-2.5 text-sm font-bold text-white"
        >
          Reload
        </button>
      </div>
    );
  }
}

// Results pages receive their session id through router state, which a hard
// refresh drops. This keeps the id in sessionStorage so refreshing a results
// page (or reopening it in the same tab) restores it instead of bouncing home.
function KeepSessionState({ children }) {
  const location = useLocation();
  const key = `im_session:${location.pathname}`;
  const fromState = location.state?.sessionId;

  if (fromState) {
    try { sessionStorage.setItem(key, fromState); } catch { /* storage unavailable */ }
    return children;
  }

  let stored = null;
  try { stored = sessionStorage.getItem(key); } catch { /* storage unavailable */ }
  if (stored) {
    return <Navigate to={location.pathname} replace state={{ sessionId: stored }} />;
  }
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <Router>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          {/* Dashboard & Main Features (require login) */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/start-interview" element={<ProtectedRoute><StartInterview /></ProtectedRoute>} />
          <Route path="/mock-interviews" element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/interview-completed" element={<ProtectedRoute><KeepSessionState><InterviewCompleted /></KeepSessionState></ProtectedRoute>} />
          <Route path="/feedback-results" element={<ProtectedRoute><KeepSessionState><FeedbackResults /></KeepSessionState></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute><PracticeQuestions /></ProtectedRoute>} />
          <Route path="/performance" element={<ProtectedRoute><PerformanceAnalytics /></ProtectedRoute>} />
          <Route path="/career" element={<ProtectedRoute><CareerAcademic /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
          <Route path="/upgrade" element={<ProtectedRoute><UpgradePlan /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </Router>
      </UserProvider>
    </ErrorBoundary>
  );
}