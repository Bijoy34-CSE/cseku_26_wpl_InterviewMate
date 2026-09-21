import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getCurrentUser } from '../../api';
import { useUser } from '../../context/UserContext';

/**
 * Landing point for Google/GitHub sign-in. The backend completes the OAuth
 * exchange server-side and redirects here with a freshly issued app token;
 * we store it, load the user, and continue to the dashboard.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useUser();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      navigate(`/login?error=${encodeURIComponent(error || 'Sign-in failed. Please try again.')}`, { replace: true });
      return;
    }

    localStorage.setItem('token', token);
    getCurrentUser()
      .then(({ data }) => {
        login(data.user, token);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate(`/login?error=${encodeURIComponent('Could not complete sign-in. Please try again.')}`, { replace: true });
      });
  }, [params, navigate, login]);

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-[#5846F6]" />
      <p className="text-xs font-bold text-slate-500">Completing sign-in...</p>
    </div>
  );
}
