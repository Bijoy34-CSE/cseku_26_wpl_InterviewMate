import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { 
  LayoutDashboard, 
  PlayCircle, 
  MessageSquareText, 
  Target, 
  BarChart3, 
  GraduationCap, 
  User, 
  Settings, 
  Users,
  MessageSquarePlus,
  HelpCircle,
  LogOut,
  Cpu,
  Sparkles
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();

  // Subtitle Bold Pulse State (AI ADAPTIVE ENGINE)
  const [isBold, setIsBold] = useState(false);

  // AI ADAPTIVE ENGINE Bold-to-Normal Loop
  useEffect(() => {
    const boldInterval = setInterval(() => {
      setIsBold((prev) => !prev);
    }, 1200);

    return () => clearInterval(boldInterval);
  }, []);

  // মূল মেনু আইটেমসমূহ
  const mainNavItems = [
    { 
      name: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/dashboard', 
      iconBg: 'bg-blue-100 text-blue-600' 
    },
    { 
      name: 'Start Interview', 
      icon: PlayCircle, 
      path: '/start-interview', 
      iconBg: 'bg-emerald-100 text-emerald-600' 
    },
    { 
      name: 'Mock Interviews', 
      icon: MessageSquareText, 
      path: '/mock-interviews', 
      iconBg: 'bg-purple-100 text-purple-600' 
    },
    { 
      name: 'Practice', 
      icon: Target, 
      path: '/practice', 
      iconBg: 'bg-amber-100 text-amber-600' 
    },
    { 
      name: 'Performance', 
      icon: BarChart3, 
      path: '/performance', 
      iconBg: 'bg-rose-100 text-rose-600' 
    },
    { 
      name: 'Career & Academic', 
      icon: GraduationCap, 
      path: '/career', 
      iconBg: 'bg-teal-100 text-teal-600' 
    },
    { 
      name: 'Community', 
      icon: Users, 
      path: '/community', 
      iconBg: 'bg-sky-100 text-sky-600' 
    },
  ];

  // ফুটার মেনু আইটেমসমূহ
  const footerNavItems = [
    { 
      name: 'Profile', 
      icon: User, 
      path: '/profile', 
      iconBg: 'bg-[#EEEDFE] text-[#5846F6]' 
    },
    { 
      name: 'Settings', 
      icon: Settings, 
      path: '/settings', 
      iconBg: 'bg-slate-200 text-slate-700' 
    },
    { 
      name: 'Feedback', 
      icon: MessageSquarePlus, 
      path: '/feedback', 
      iconBg: 'bg-orange-100 text-orange-600' 
    },
    { 
      name: 'Help', 
      icon: HelpCircle, 
      path: '/help', 
      iconBg: 'bg-violet-100 text-violet-600' 
    },
  ];

  return (
    <aside className="w-64 bg-slate-50/80 backdrop-blur-xl border-r border-slate-200/80 flex flex-col justify-between shrink-0 min-h-screen p-4 select-none">
      
      <div className="space-y-6">
        {/* Exact Match Brand Header */}
        <div 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 px-1 py-1 cursor-pointer group"
        >
          {/* Neon Bordered Container with Dark Inner Box */}
          <div className="relative w-11 h-11 rounded-[16px] bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all duration-300 shrink-0">
            <div className="w-full h-full bg-[#0a0d1d] rounded-[14px] flex items-center justify-center relative overflow-hidden">
              
              {/* Rotating Cyan CPU Icon */}
              <Cpu className="w-5 h-5 text-cyan-400 z-10 animate-[spin_8s_linear_infinite]" />
              
              {/* Pink Glowing Sparkles */}
              <Sparkles className="w-3.5 h-3.5 text-pink-500 absolute top-1 right-1 animate-pulse" />
            </div>
          </div>

          <div>
            {/* InterviewMate Exact Gradient Text */}
            <h1 className="font-extrabold text-lg leading-none tracking-tight bg-gradient-to-r from-[#5846F6] via-purple-600 to-[#FF2A85] bg-clip-text text-transparent">
              InterviewMate
            </h1>
            
            {/* AI ADAPTIVE ENGINE Subtitle with Pink AI */}
            <span 
              className={`text-[9px] italic tracking-wider uppercase block mt-1 font-mono transition-all duration-700 ease-in-out ${
                isBold 
                  ? 'font-black text-slate-900 opacity-100 scale-[1.02]' 
                  : 'font-semibold text-slate-700 opacity-80 scale-100'
              }`}
            >
              <span className="text-[#FF2A85] font-black">AI</span> ADAPTIVE ENGINE
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1.5">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 block mb-2">
            Main Platform
          </span>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-white text-[#5846F6] shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#5846F6] rounded-r-full" />
                )}

                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-xl transition-transform duration-200 group-hover:scale-110 ${item.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-[#5846F6] text-white' : 'bg-indigo-100 text-[#5846F6]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System & Support Section */}
      <div className="space-y-3 pt-3 border-t border-slate-200/80">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 block mb-1">
            System & Support
          </span>
          {footerNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-[#5846F6] shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${item.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* User Profile Card */}
        <div className="bg-white border border-slate-200/80 p-2.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 overflow-hidden cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#5846F6] flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100">
              {user?.initials || 'U'}
            </div>
            <div className="truncate">
              <h4 className="text-xs font-black text-slate-900 truncate leading-tight group-hover:text-[#5846F6] transition-colors">
                {user?.name || ''}
              </h4>
              <p className="text-[10px] font-semibold text-slate-400 truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>

          <button 
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </aside>
  );
}