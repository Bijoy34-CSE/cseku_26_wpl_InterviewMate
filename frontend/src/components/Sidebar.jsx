import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import Logo from './Logo';
import {
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const mainNavItems = [
  { name: 'Dashboard', image: '/sidebar-buttons/Dashboard.png', path: '/dashboard' },
  { name: 'Start Interview', image: '/sidebar-buttons/StartInterview.png', path: '/start-interview' },
  { name: 'Mock Interviews', image: '/sidebar-buttons/MockInterviews.png', path: '/mock-interviews' },
  { name: 'History', image: '/sidebar-buttons/History.png', path: '/history' },
  { name: 'Performance', image: '/sidebar-buttons/Performance.png', path: '/performance' },
  { name: 'Career & Academic', image: '/sidebar-buttons/Career&Academic.png', path: '/career' },
  { name: 'Community', image: '/sidebar-buttons/Community.png', path: '/community' },
];

const footerNavItems = [
  { name: 'Profile', image: '/sidebar-buttons/Profile.png', path: '/profile' },
  { name: 'Settings', image: '/sidebar-buttons/Settings.png', path: '/settings' },
  { name: 'Feedback', image: '/sidebar-buttons/Feedback.png', path: '/feedback' },
  { name: 'Help', image: '/sidebar-buttons/Help.png', path: '/help' },
  { name: 'Upgrade Plan', image: '/sidebar-buttons/UpgradePlan.png', path: '/upgrade' },
];

function NavButton({ item, active, compact, onGo }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onGo(item.path)}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl text-left text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846F6] focus-visible:ring-offset-2 ${
        compact ? 'px-3 py-2' : 'px-3 py-2.5'
      } ${
        active
        ? 'border border-[#2438d5] bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] text-white shadow-lg shadow-blue-900/20'
        : 'border border-transparent text-slate-700 hover:border-white/90 hover:bg-white/65 hover:text-blue-950 hover:shadow-sm'
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-white/70" />}
      <span className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg transition-transform duration-200 group-hover:scale-110 ${item.image ? '' : item.iconTone}`}>
        {item.image ? (
          <img src={`${item.image}?v=3`} alt="" aria-hidden="true" className="h-full w-full object-contain mix-blend-screen" />
        ) : (
          <Icon className="h-[17px] w-[17px] stroke-[2.25]" />
        )}
      </span>
      <span className="truncate">{item.name}</span>
    </button>
  );
}

function SidebarBody({ onGo, onHelpClick, pathname, user, onLogout }) {
  const accountItems = user?.role === 'admin'
    ? [...footerNavItems, { name: 'Admin Panel', image: '/sidebar-buttons/AdminPanel.png', path: '/admin' }]
    : footerNavItems;
  return (
    <div className="relative z-10 flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => onGo('/dashboard')}
          className="group flex w-full items-center rounded-2xl border border-white/90 bg-white/70 px-3 py-3 text-left shadow-lg shadow-blue-900/5 backdrop-blur-xl transition hover:border-blue-200 hover:bg-white/90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="InterviewMate dashboard"
        >
          <Logo size={38} subtitle />
        </button>

        <nav className="space-y-1.5" aria-label="Main navigation">
          <span className="mb-2 block px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-800/75">
            Your workspace
          </span>
          {mainNavItems.map((item) => (
            <NavButton key={item.path} item={item} active={pathname === item.path} onGo={onGo} />
          ))}
        </nav>
      </div>

      <div className="mt-5 space-y-4 border-t border-blue-300/40 pt-4">
        <div className="space-y-1">
          <span className="mb-2 block px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-800/75">
            Account
          </span>
          {accountItems.map((item) => (
            <NavButton
              key={item.path}
              item={item}
              active={pathname === item.path}
              compact
              onGo={item.path === '/help' && onHelpClick ? onHelpClick : onGo}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/90 bg-white/70 p-2.5 shadow-lg shadow-blue-900/5 backdrop-blur-xl">
          <button type="button" onClick={() => onGo('/profile')} className="group flex min-w-0 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846F6]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-400 text-xs font-black text-slate-950 ring-1 ring-white/30">
              {user?.initials || user?.name?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'U'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-blue-700">
                {user?.name || 'Your profile'}
              </span>
              <span className="block truncate text-[10px] font-medium text-slate-600">{user?.email || 'Manage your account'}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="rounded-xl p-1.5 text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ onHelpClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const menuButtonRef = useRef(null);
  const drawerRef = useRef(null);

  // Close the drawer on navigation and lock body scroll while it is open.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const menuButton = menuButtonRef.current;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = drawerRef.current?.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      menuButton?.focus();
    };
  }, [open]);

  const go = (path) => {
    navigate(path);
    setOpen(false);
  };
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const handleHelpClick = onHelpClick
    ? () => {
        onHelpClick();
        setOpen(false);
      }
    : undefined;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="im-sidebar-surface relative hidden w-[17rem] shrink-0 select-none border-r border-slate-950/20 lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarBody onGo={go} onHelpClick={handleHelpClick} pathname={location.pathname} user={user} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="lg:hidden fixed inset-x-0 top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center pt-[env(safe-area-inset-top,0px)] justify-between border-b border-blue-200/70 bg-[#e7efff]/95 px-4 shadow-sm shadow-blue-950/5 backdrop-blur-xl">
        <button type="button" onClick={() => go('/dashboard')} className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846F6]" aria-label="InterviewMate dashboard">
          <Logo size={30} textClassName="text-base" />
        </button>
        <button
          type="button"
          ref={menuButtonRef}
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5846F6] active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation"
            className="im-fade-in absolute inset-0 h-full w-full cursor-default bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            ref={drawerRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="im-sidebar-surface im-slide-in absolute left-0 top-0 h-full w-72 pt-[env(safe-area-inset-top,0px)] max-w-[85vw] overflow-y-auto border-r border-slate-950/20 shadow-2xl"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 z-10 rounded-xl p-2 text-slate-600 transition hover:bg-white/80 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onGo={go} onHelpClick={handleHelpClick} pathname={location.pathname} user={user} onLogout={handleLogout} />
          </aside>
        </div>
      )}
    </>
  );
}
