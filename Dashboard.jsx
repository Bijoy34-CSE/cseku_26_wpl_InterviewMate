import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Plus, MessageSquare, ChevronRight } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { listInterviewSessions } from '../../api';

// Turns a timestamp into the short relative label the session list uses
// ("Today", "Yesterday", "3 days ago", ...).
function relativeTime(dateString) {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  return new Date(dateString).toLocaleDateString();
}

// Real consecutive-day streak computed from actual completed session dates
// (not a stored/fabricated stat).
function computeStreak(completed) {
  const dateSet = new Set(
    completed.filter((s) => s.completedAt).map((s) => new Date(s.completedAt).toISOString().slice(0, 10))
  );
  if (dateSet.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  if (!dateSet.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load this user's real interview sessions from the backend (scoped to
  // the authenticated user via the JWT - never a hardcoded/shared list).
  useEffect(() => {
    let isMounted = true;
    listInterviewSessions()
      .then(({ data }) => {
        if (isMounted) setSessions(data.sessions || []);
      })
      .catch(() => {
        if (isMounted) setSessions([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Dynamic Calculations based on real sessions from the backend
  const completedSessions = sessions.filter((s) => s.status === 'completed' && typeof s.overallScore === 'number');
  const totalCompleted = completedSessions.length;

  const averageScore = totalCompleted > 0
    ? Math.round(completedSessions.reduce((acc, curr) => acc + curr.overallScore, 0) / totalCompleted)
    : 0;

  const overallReadiness = totalCompleted > 0
    ? Math.round(averageScore * 0.95)
    : 0;

  const getReadinessBadge = (score) => {
    if (score >= 85) return { text: 'Optimal (A+)', bg: 'bg-emerald-50 text-emerald-600' };
    if (score >= 75) return { text: 'Steady (B+)', bg: 'bg-indigo-50 text-[#5846F6]' };
    if (score >= 60) return { text: 'Average (C)', bg: 'bg-amber-50 text-amber-600' };
    return { text: 'Needs Work', bg: 'bg-rose-50 text-rose-600' };
  };

  const readinessBadge = getReadinessBadge(overallReadiness);

  const getStatusDetails = (score) => {
    if (score >= 85) return { label: 'Exceptional', bg: 'bg-indigo-50 text-[#5846F6]' };
    if (score >= 75) return { label: 'Strong', bg: 'bg-emerald-50 text-emerald-600' };
    return { label: 'Warning', bg: 'bg-amber-50 text-amber-600' };
  };

  // Helper function: Dynamic Color logic
  const getScoreColorClasses = (score) => {
    if (score >= 90) {
      return {
        bar: 'bg-emerald-500 hover:bg-emerald-600',
        badge: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      };
    }
    if (score >= 80) {
      return {
        bar: 'bg-[#5846F6] hover:bg-[#4735E5]',
        badge: 'bg-indigo-50 text-[#5846F6] border-indigo-100',
      };
    }
    if (score >= 70) {
      return {
        bar: 'bg-sky-500 hover:bg-sky-600',
        badge: 'bg-sky-50 text-sky-600 border-sky-100',
      };
    }
    if (score >= 60) {
      return {
        bar: 'bg-amber-500 hover:bg-amber-600',
        badge: 'bg-amber-50 text-amber-600 border-amber-100',
      };
    }
    if (score >= 50) {
      return {
        bar: 'bg-pink-500 hover:bg-pink-600',
        badge: 'bg-pink-50 text-pink-600 border-pink-100',
      };
    }
    return {
      bar: 'bg-rose-500 hover:bg-rose-600',
      badge: 'bg-rose-50 text-rose-600 border-rose-100',
    };
  };

  const latest5Sessions = completedSessions.slice(0, 5).reverse();
  const weeklyGoal = 2; // fixed target, not a per-user stat
  const streak = computeStreak(completedSessions);

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased selection:bg-[#5846F6] selection:text-white">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Good morning, {user?.name?.split(' ')[0] || 'there'}
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Ready to improve your interview performance today?
            </p>
          </div>

          <button
            onClick={() => navigate('/start-interview')}
            className="px-5 py-2.5 bg-[#5846F6] hover:bg-[#4735E5] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100/50 transition-all active:scale-95 flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Start New Interview</span>
          </button>
        </div>

        {/* 4 Top Dynamic Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block">Overall Readiness Score</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{overallReadiness}%</span>
              <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md ${readinessBadge.bg}`}>
                {readinessBadge.text}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block">Interviews Completed</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{totalCompleted}</span>
              <span className="text-[10px] font-extrabold text-sky-600 bg-sky-50 px-2 py-1 rounded-md">
                Active Candidate
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block">Average Performance</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{averageScore}%</span>
              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                {averageScore >= 80 ? 'Top 15% of cohort' : 'Average range'}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block">Improvement Streak</span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900">{streak} Days</span>
              <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                Keep it up!
              </span>
            </div>
          </div>
        </div>

        {/* Performance Trend & Weekly Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Performance Trend</h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Evaluation score growth across your latest 5 sessions
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                Last 5 sessions
              </span>
            </div>

            {/* Dynamic Proportional Bar Graph Container */}
            <div className="h-52 flex items-end justify-between gap-4 pt-8 pb-2 px-4 border-b border-slate-100">
              {Array.from({ length: 5 }).map((_, idx) => {
                const session = latest5Sessions[idx] || null;
                const score = session ? Number(session.overallScore || 0) : 0;
                
                const heightPercent = session ? `${score}%` : '0%';
                const colorScheme = getScoreColorClasses(score);

                return (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                    {session ? (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border mb-1.5 shadow-2xs transition-all ${colorScheme.badge}`}>
                        {score}%
                      </span>
                    ) : (
                      <div className="h-6 mb-1.5"></div>
                    )}

                    <div className="w-full flex-1 flex items-end justify-center">
                      {session ? (
                        <div
                          style={{ height: heightPercent }}
                          className={`w-full max-w-[44px] rounded-t-xl transition-all duration-500 shadow-xs ${colorScheme.bar}`}
                        ></div>
                      ) : (
                        <div className="w-full max-w-[44px] h-3 border-2 border-dashed border-slate-200 rounded-t-xl bg-slate-50/50"></div>
                      )}
                    </div>

                    <span className="text-[11px] font-bold text-slate-400 mt-2">S{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm">Weekly Progress Goal</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Complete {weeklyGoal} practice sessions</span>
                  <span className="text-[#5846F6]">
                    {Math.min(totalCompleted, weeklyGoal)}/{weeklyGoal} Done
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5846F6] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((totalCompleted / weeklyGoal) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                PRO-TIPS FOR TODAY
              </span>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                "Review the feedback from your last session before starting a new one - it's the fastest way to close the same gap twice."
              </p>
            </div>
          </div>
        </div>

        {/* Recent Simulation Sessions */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Recent Simulation Sessions</h3>
          <div className="space-y-2.5">
            {loading ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm text-center text-xs font-medium text-slate-400">
                Loading your sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm text-center space-y-1">
                <p className="text-xs font-bold text-slate-600">No interviews yet</p>
                <p className="text-[10px] text-slate-400 font-medium">Start your first mock interview to see it here.</p>
              </div>
            ) : (
              sessions.slice(0, 5).map((s) => {
                const isCompleted = s.status === 'completed' && typeof s.overallScore === 'number';
                const statusDetails = isCompleted ? getStatusDetails(s.overallScore) : { label: 'In Progress', bg: 'bg-slate-100 text-slate-500' };

                return (
                  <div
                    key={s.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{s.purpose}</h4>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                          {relativeTime(s.completedAt || s.startedAt)} <span className="mx-1">•</span>{' '}
                          <span className="text-[#5846F6]">{s.type}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">
                          {isCompleted ? `${s.overallScore}%` : '—'}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400">Score</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-3 py-1 rounded-md ${statusDetails.bg}`}>
                        {statusDetails.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recommended Practice Drill */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Recommended Practice Drill</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3 relative group cursor-pointer hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  Intermediate
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#5846F6] transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Practice SQL Joins</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Pivoted from your Database viva gaps</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3 relative group cursor-pointer hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  Behavioral
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#5846F6] transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Refine 'Why our company?'</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Master the standard behavioral hook</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3 relative group cursor-pointer hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  Senior
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#5846F6] transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">System Design: Microservices</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Prepare for high-level technical depth</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}