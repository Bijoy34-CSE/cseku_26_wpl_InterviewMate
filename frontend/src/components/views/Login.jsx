import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle, 
  Mail, 
  Lock, 
  ShieldAlert, 
  X, 
} from 'lucide-react';
import { loginUser, startOAuth, getAuthConfig, requestPasswordReset, verifyPasswordResetCode, resetPassword } from '../../api';
import { useUser } from '../../context/UserContext';
import Logo from '../Logo';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, authLoading } = useUser();

  // Already logged in (valid persisted session) - skip the login form
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const selectedPlan = searchParams.get('plan');
      navigate(selectedPlan === 'yearly' || selectedPlan === 'monthly' ? `/upgrade?plan=${selectedPlan}` : '/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [oauthConfig, setOauthConfig] = useState({ google: false, github: false });
  // OAuth failures come back as ?error= on this page.
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) setErrorMessage(oauthError);
  }, [searchParams]);

  useEffect(() => {
    getAuthConfig()
      .then(({ data }) => setOauthConfig({ google: !!data.google, github: !!data.github }))
      .catch(() => setOauthConfig({ google: false, github: false }));
  }, []);

  // Forgot Password Modal State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetCodeVerified, setResetCodeVerified] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Real Backend Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setNoticeMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      // Real API Call to Backend Node/Express Server
      const { data } = await loginUser({ email, password, rememberMe });

      // Store the token and hydrate the shared UserContext
      login(data.user, data.token, rememberMe);

      setLoading(false);
      const selectedPlan = searchParams.get('plan');
      navigate(selectedPlan === 'yearly' || selectedPlan === 'monthly' ? `/upgrade?plan=${selectedPlan}` : '/dashboard');
    } catch (error) {
      setLoading(false);
      // Unverified account: send them to finish email verification.
      if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
        navigate('/verify-email', { state: { email: error.response.data.email || email } });
        return;
      }
      setErrorMessage(error.response
        ? error.response.data?.message || 'Unable to sign in. Please try again.'
        : 'Cannot connect to InterviewMate right now. Check your connection and try again.');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      await requestPasswordReset(resetEmail);
      setResetSent(true);
    } catch (error) {
      setResetError(error.response?.data?.message || 'Could not send a reset code. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setResetError('Password must be at least 8 characters and contain a letter and a number.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    try {
      const { data } = await resetPassword({
        email: resetEmail,
        otp: resetCode,
        password: newPassword,
        confirmPassword: confirmNewPassword,
      });
      setIsForgotOpen(false);
      setResetSent(false);
      setPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetCode('');
      setNoticeMessage(data.message || 'Password reset successfully. You can now log in.');
    } catch (error) {
      setResetError(error.response?.data?.message || 'Could not reset your password. Please check the code and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyResetCode = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!/^\d{6}$/.test(resetCode)) {
      setResetError('Enter the 6-digit reset code from your email.');
      return;
    }

    setResetLoading(true);
    try {
      await verifyPasswordResetCode({ email: resetEmail, otp: resetCode });
      setResetCodeVerified(true);
    } catch (error) {
      setResetError(error.response?.data?.message || 'Could not verify the reset code. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="im-auth-page relative min-h-screen overflow-hidden px-4 py-6 font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" aria-label="InterviewMate home"><Logo size={42} subtitle /></Link>
        <Link to="/" className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-white">Back to home</Link>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 py-8 lg:min-h-[calc(100vh-100px)] lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:py-10">
        <section className="hidden rounded-[2rem] bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] p-10 text-white shadow-2xl shadow-blue-950/20 lg:block">
          <h1 className="mt-8 max-w-md text-4xl font-black leading-tight tracking-tight">Your next great interview starts with practice.</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-indigo-100">Sign in to pick up where you left off and keep building confidence with InterviewMate.</p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[['3 sessions', 'Free each month'], ['AI feedback', 'Personalized insights']].map(([title, detail]) => (
              <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-lg font-black text-white">{title}</p>
                <p className="mt-1 text-xs font-semibold text-indigo-100">{detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-xs font-semibold text-cyan-100">Private by design · Your account, your progress</p>
        </section>

        <section className="mx-auto w-full max-w-md">
        <div className="rounded-[28px] border border-white/80 bg-white/95 px-6 py-8 shadow-2xl shadow-indigo-950/10 backdrop-blur-xl sm:px-10">
          <div className="mb-2 space-y-3 text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome back</h2>
            <p className="pb-2 text-sm font-medium leading-relaxed text-slate-500">Resume your viva & technical interview preparation</p>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}
          {noticeMessage && (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              {noticeMessage}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin} autoComplete="on">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                Work or University Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  name="username"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-extrabold tracking-wider text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 font-medium">Remember my device for 30 days</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] py-3.5 text-xs font-bold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Log In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setResetEmail(email);
              setResetError('');
              setResetSent(false);
              setResetCodeVerified(false);
              setResetCode('');
              setNewPassword('');
              setConfirmNewPassword('');
              setIsForgotOpen(true);
            }}
            className="mt-3 w-full rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-xs font-extrabold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
          >
            Forgot Password?
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
              <span className="bg-white px-3 text-slate-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => startOAuth('google', searchParams.get('plan'))}
              disabled={!oauthConfig.google}
              title={oauthConfig.google ? 'Continue with Google' : 'Google sign-in is not configured on the server'}
              className="w-full bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 rounded-xl py-2.5 text-xs font-bold text-slate-700 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => startOAuth('github', searchParams.get('plan'))}
              disabled={!oauthConfig.github}
              title={oauthConfig.github ? 'Continue with GitHub' : 'GitHub sign-in is not configured on the server'}
              className="w-full bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 rounded-xl py-2.5 text-xs font-bold text-slate-700 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <svg className="w-4 h-4 fill-slate-800" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>
          <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs font-medium leading-relaxed text-slate-500">
            Don't have an account?{' '}
            <Link to={searchParams.get('plan') ? `/signup?plan=${searchParams.get('plan')}` : '/signup'} className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </section>
      </main>

      {/* FORGOT PASSWORD MODAL */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="reset-password-title" className="bg-white border border-slate-100 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsForgotOpen(false)}
              aria-label="Close password reset"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 id="reset-password-title" className="font-bold text-base text-slate-900">Reset Password</h3>
              <p className="text-xs text-slate-500">We’ll email a one-time reset code if an eligible account exists.</p>
            </div>

            {resetError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{resetError}</p>}

            {resetSent ? (
              <>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center space-y-1">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-xs text-emerald-800">{resetCodeVerified ? 'Reset code verified' : 'Check your inbox'}</h4>
                  <p className="text-[11px] text-emerald-600">
                    {resetCodeVerified
                      ? 'Choose and confirm your new password below.'
                      : 'If the account is eligible, a reset code has been sent.'}
                  </p>
                </div>
                <form onSubmit={resetCodeVerified ? handleResetPassword : handleVerifyResetCode} className="space-y-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit reset code"
                    aria-label="Reset code"
                    disabled={resetCodeVerified}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  {resetCodeVerified && (
                    <>
                      <input
                        type="password"
                        autoComplete="new-password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (8+ characters)"
                        aria-label="New password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm new password"
                        aria-label="Confirm new password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-blue-100"
                  >
                    {resetLoading
                      ? (resetCodeVerified ? 'Resetting password…' : 'Verifying code…')
                      : (resetCodeVerified ? 'Set New Password' : 'Verify Code')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetSent(false); setResetCodeVerified(false); setResetCode(''); setResetError(''); }}
                    className="w-full py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    Send another code
                  </button>
                </form>
              </>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-blue-100"
                >
                  {resetLoading ? 'Sending code…' : 'Send Reset Code'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}