import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Mail, 
  Lock, 
  User, 
  Phone,
  GraduationCap,
  ShieldAlert 
} from 'lucide-react';
import { registerUser, startOAuth, getAuthConfig } from '../../api';
import { useUser } from '../../context/UserContext';
import BrandLogo from '../Logo';

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, authLoading } = useUser();

  // Already logged in (valid persisted session) - skip the signup form
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const selectedPlan = searchParams.get('plan');
      navigate(selectedPlan === 'yearly' || selectedPlan === 'monthly' ? `/upgrade?plan=${selectedPlan}` : '/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, searchParams]);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [university, setUniversity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [goal, setGoal] = useState('both');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [oauthConfig, setOauthConfig] = useState({ google: false, github: false });

  useEffect(() => {
    getAuthConfig()
      .then(({ data }) => setOauthConfig({ google: !!data.google, github: !!data.github }))
      .catch(() => setOauthConfig({ google: false, github: false }));
  }, []);
  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (mobile && !/^\+?[\d\s-]{7,20}$/.test(mobile)) {
      setErrorMessage('Please enter a valid mobile number.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setErrorMessage('Password must contain at least one letter and one number.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        mobile: mobile.trim(),
        university: university.trim(),
        email,
        password,
        confirmPassword,
        goal
      };

      await registerUser(payload);

      setLoading(false);
      // Account is created but unverified - the backend has emailed a code.
      navigate('/verify-email', { state: { email, plan: searchParams.get('plan') } });
    } catch (error) {
      setLoading(false);
      setErrorMessage(error.response
        ? error.response.data?.message || 'Registration failed. Please try again.'
        : 'Cannot connect to InterviewMate right now. Check your connection and try again.');
    }
  };

  return (
    <div className="im-auth-page relative min-h-screen overflow-hidden px-4 py-6 font-sans text-slate-800 antialiased sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" aria-label="InterviewMate home"><BrandLogo size={42} subtitle /></Link>
        <Link to="/" className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-white">Back to home</Link>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 py-8 lg:min-h-[calc(100vh-100px)] lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:py-10">
        <section className="hidden rounded-[2rem] bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] p-10 text-white shadow-2xl shadow-blue-950/20 lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-100"><ShieldAlert className="h-3.5 w-3.5" /> Your next step starts here</span>
          <h1 className="mt-8 max-w-md text-4xl font-black leading-tight tracking-tight">Practice with confidence. Show up prepared.</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-indigo-100">Create your private InterviewMate account and get interview practice tailored to your goals.</p>
          <div className="mt-10 space-y-4">
            {['Personalized AI interview practice', 'Clear feedback and progress insights', 'Your account data stays yours'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white/90"><span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-300/15 text-cyan-200">✓</span>{item}</div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-white/15 bg-white/10 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-100">Start for free</p>
            <p className="mt-2 text-sm leading-relaxed text-indigo-100">Get 3 interview sessions each month, then upgrade whenever you are ready.</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[520px]">
        <div className="rounded-[28px] border border-white/80 bg-white/95 px-6 py-7 shadow-2xl shadow-indigo-950/10 backdrop-blur-xl sm:px-9 sm:py-9">
          
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
            <p className="text-xs text-slate-500 font-medium">Get robust metrics and personalized oral vivas</p>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSignup} autoComplete="on">
            <div>
              <label htmlFor="signup-name" className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Your name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input id="signup-name" name="name" type="text" required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter Your Name" className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">MOBILE NUMBER</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter your phone number (optional)"
                  className="w-full bg-slate-50/70 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">UNIVERSITY / COLLEGE</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  name="organization"
                  autoComplete="organization"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="Enter your university or college (optional)"
                  className="w-full bg-slate-50/70 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                EMAIL
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-slate-50/70 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="new-password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-50/70 border border-slate-200/80 rounded-xl pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
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

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">CONFIRM PASSWORD</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirm-password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full bg-slate-50/70 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] font-bold text-rose-500 mt-1.5">Passwords do not match</p>
              )}
            </div>

            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-800 mb-0.5">
                What do you mainly want to prepare for?
              </label>
              <p className="text-[10px] text-slate-400 font-medium mb-2.5">
                This personalizes your initial feed but doesn't lock features.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'jobs', title: 'Jobs', desc: 'Industry offers' },
                  { id: 'university', title: 'University', desc: 'Academic Viva' },
                  { id: 'both', title: 'Both', desc: 'Ultimate readiness' }
                ].map((item) => {
                  const isSelected = goal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-600'
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/60'
                      }`}
                    >
                      <span className={`block text-xs font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                        {item.title}
                      </span>
                      <span className="block text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] py-3.5 text-xs font-bold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Create Account & Personalize <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/80"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-extrabold uppercase tracking-wider">
              <span className="bg-white px-3 text-slate-400">OR CONTINUE WITH</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => startOAuth('google', searchParams.get('plan'))}
              disabled={!oauthConfig.google}
              title={oauthConfig.google ? 'Continue with Google' : 'Google sign-in is not configured on the server'}
              className="w-full bg-slate-50/80 hover:bg-slate-100/80 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200/80 rounded-xl py-2.5 text-xs font-bold text-slate-700 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
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
              className="w-full bg-slate-50/80 hover:bg-slate-100/80 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200/80 rounded-xl py-2.5 text-xs font-bold text-slate-700 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <svg className="w-4 h-4 fill-slate-800" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>
          <p className="text-center text-xs text-slate-500 font-medium pt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
              Log In
            </Link>
          </p>
        </div>
        </section>
      </main>
    </div>
  );
}