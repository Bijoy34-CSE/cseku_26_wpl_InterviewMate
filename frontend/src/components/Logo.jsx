import React, { useId } from 'react';

// InterviewMate's conversation-and-signal mark, shared across the app and PWA.
export function LogoMark({ size = 40, className = '' }) {
  const gradientId = `im-mark-${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="InterviewMate"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="12" y1="52" x2="52" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#43D5E8" />
          <stop offset="0.55" stopColor="#6687FF" />
          <stop offset="1" stopColor="#A879FF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="#111A35" />
      <path
        d="M21 15h23a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H31l-10 7v-7h-1a8 8 0 0 1-8-8V23a8 8 0 0 1 8-8z"
        fill="#19264A"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 32h4l3-6 5 13 4-10 2.5 3H45" fill="none" stroke="#EAF5FF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="48" cy="16" r="2.2" fill="#43D5E8" />
    </svg>
  );
}

export default function Logo({ size = 40, subtitle = false, className = '', textClassName = '', tone = 'dark' }) {
  const isLight = tone === 'light';
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark size={size} />
      <span className="min-w-0 leading-none">
        <span className={`block whitespace-nowrap font-heading text-[19px] font-extrabold tracking-[-0.045em] ${textClassName || (isLight ? 'text-white' : 'text-[#142344]')}`}>
          Interview<span className={isLight ? 'text-cyan-300' : 'text-[#365FEA]'}>Mate</span>
        </span>
        {subtitle && (
          <span className={`mt-1 block text-[8px] font-bold uppercase tracking-[0.16em] ${isLight ? 'text-blue-100/85' : 'text-slate-500'}`}>
            AI Interview Coach
          </span>
        )}
      </span>
    </span>
  );
}
