import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Cpu, Sparkles, ShieldAlert, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { verifyOtp, resendOtp } from '../../api';
import { useUser } from '../../context/UserContext';

const OTP_LENGTH = 6;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useUser();

  const email = location.state?.email || '';

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState(false);

  const inputsRef = useRef([]);

  // No email in navigation state means the user landed here directly.
  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
  }, [email, navigate]);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const code = digits.join('');

  const handleChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      setDigits((prev) => prev.map((d, i) => (i === index ? '' : d)));
      return;
    }
    // Support pasting the whole code into any box
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, OTP_LENGTH).split('');
      setDigits(Array.from({ length: OTP_LENGTH }, (_, i) => chars[i] || ''));
      inputsRef.current[Math.min(chars.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    setDigits((prev) => prev.map((d, i) => (i === index ? cleaned : d)));
    if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (code.length !== OTP_LENGTH) {
      setErrorMessage(`Please enter all ${OTP_LENGTH} digits.`);
      return;
    }

    setLoading(true);
    try {
      const { data } = await verifyOtp({ email, otp: code });
      setLoading(false);
      setSuccess(true);
      // Brief success animation, then straight into the app.
      setTimeout(() => {
        login(data.user, data.token);
        navigate('/dashboard', { replace: true });
      }, 1900);
    } catch (error) {
      setLoading(false);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
      setErrorMessage(error.response?.data?.message || 'Verification failed. Please try again.');
    }
  };

  const handleResend = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setResending(true);
    try {
      const { data } = await resendOtp({ email });
      setInfoMessage(`A new code was sent to ${email}.`);
      setCooldown(data.cooldownSeconds || 60);
    } catch (error) {
      const retry = error.response?.data?.retryAfter;
      if (retry) setCooldown(retry);
      setErrorMessage(error.response?.data?.message || 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const Logo = () => (
    <div className="flex items-center justify-center gap-3 cursor-pointer">
      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/20 shrink-0">
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
          <Cpu className="w-5 h-5 text-cyan-400 z-10 animate-spin" style={{ animationDuration: '6s' }} />
          <Sparkles className="w-3 h-3 text-pink-400 absolute top-1 right-1 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-sm"></div>
        </div>
      </div>
      <div className="text-left">
        <h1 className="font-black text-2xl leading-none tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
          InterviewMate
        </h1>
        <span className="text-[8px] italic tracking-wider uppercase block font-mono font-medium text-slate-500 opacity-80">
          <span className="text-pink-500 font-bold">AI</span> ADAPTIVE ENGINE
        </span>
      </div>
    </div>
  );

  // ---- Registration success animation ----
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-emerald-200/40 via-indigo-200/30 to-pink-200/20 blur-[130px] pointer-events-none rounded-full"></div>

        <div className="z-10 flex flex-col items-center text-center space-y-5 px-6">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping"></span>
            <div className="relative w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-[bounceIn_0.5s_ease-out]">
              <CheckCircle2 className="w-11 h-11 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Registration Successful</h2>
            <p className="text-xs font-medium text-slate-500">Welcome to InterviewMate</p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 pt-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Taking you to your dashboard...</span>
          </div>
        </div>

        <style>{`
          @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            60% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-indigo-200/30 via-purple-200/30 to-pink-200/20 blur-[130px] pointer-events-none rounded-full"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 space-y-4">
        <Link to="/">
          <Logo />
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[460px] z-10 px-4 sm:px-0">
        <div className="bg-white/90 backdrop-blur-xl py-8 px-8 shadow-xl shadow-indigo-100/40 rounded-[28px] border border-white sm:px-10 space-y-6">
          <div className="text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#5846F6]" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Verify your email</h2>
            <p className="text-xs text-slate-500 font-medium">
              We sent a {OTP_LENGTH}-digit code to<br />
              <span className="font-bold text-slate-700">{email}</span>
            </p>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleVerify}>
            <div className="flex justify-center gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputsRef.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  value={digit}
                  autoFocus={index === 0}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center bg-slate-50/70 border border-slate-200/80 rounded-xl text-lg font-black text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== OTP_LENGTH}
              className="w-full bg-[#5846F6] hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify and Continue'
              )}
            </button>
          </form>

          <div className="text-center space-y-1">
            <p className="text-[11px] text-slate-400 font-medium">Didn't get the code? Check your spam folder.</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-[11px] font-extrabold text-[#5846F6] hover:text-indigo-700 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : resending ? 'Sending...' : 'Resend code'}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 font-medium mt-5">
          Wrong email?{' '}
          <Link to="/signup" className="font-extrabold text-[#5846F6] hover:text-indigo-700">
            Go back to sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
