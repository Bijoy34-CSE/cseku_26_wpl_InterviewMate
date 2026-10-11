import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { listInterviewSessions } from '../../api';
import {
  History as HistoryIcon,
  AlertCircle,
  ChevronRight,
  FileText,
  RefreshCw,
  PlayCircle,
  Clock,
  Repeat2,
} from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusOf(session) {
  if (session.status !== 'completed') return { label: 'In progress', tone: 'bg-sky-50 text-sky-700 ring-sky-100' };
  if (session.timedOut) return { label: 'Timed out', tone: 'bg-amber-50 text-amber-700 ring-amber-100' };
  const score = session.overallScore;
  if (typeof score !== 'number') return { label: 'Completed', tone: 'bg-slate-100 text-slate-600 ring-slate-200' };
  if (score >= 85) return { label: 'Exceptional', tone: 'bg-indigo-50 text-[#5846F6] ring-indigo-100' };
  if (score >= 75) return { label: 'Strong', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' };
  if (score >= 60) return { label: 'Average', tone: 'bg-amber-50 text-amber-700 ring-amber-100' };
  return { label: 'Needs work', tone: 'bg-rose-50 text-rose-700 ring-rose-100' };
}

function ScoreRing({ value }) {
  const has = typeof value === 'number';
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eef0f6" strokeWidth="3.5" />
        {has && (
          <circle
            cx="18" cy="18" r="15.9" fill="none" stroke="#5846F6" strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${value}, 100`} style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)' }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-slate-900">
        {has ? value : '-'}
      </span>
    </div>
  );
}

// Full interview history for the signed-in user. The list is filtered
// server-side by the JWT, so only this user's own sessions are ever returned.
export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listInterviewSessions()
      .then(({ data }) => setSessions(data.sessions || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your interview history.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const summary = useMemo(() => {
    const done = sessions.filter((s) => s.status === 'completed' && typeof s.overallScore === 'number');
    return {
      total: sessions.length,
      completed: done.length,
      average: done.length ? Math.round(done.reduce((a, s) => a + s.overallScore, 0) / done.length) : null,
    };
  }, [sessions]);

  const open = (session) => {
    if (session.status === 'completed') {
      navigate('/feedback-results', { state: { sessionId: session.id } });
    } else {
      navigate('/mock-interviews', { state: { sessionId: session.id } });
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--im-canvas)] text-slate-800 antialiased">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="im-fade-up flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5846F6]">Your sessions</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
                Interview history <HistoryIcon className="h-5 w-5 text-[#5846F6]" />
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-slate-500">
                Open any interview to review each question, your answer, the AI evaluation and a better answer, or practice a question again.
              </p>
            </div>
            {summary.completed > 0 && (
              <div className="im-card flex divide-x divide-slate-100 text-center">
                {[
                  ['Interviews', summary.total],
                  ['Completed', summary.completed],
                  ['Average', `${summary.average}%`],
                ].map(([k, v]) => (
                  <div key={k} className="px-4 py-2.5">
                    <p className="text-base font-extrabold text-slate-900">{v}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{k}</p>
                  </div>
                ))}
              </div>
            )}
          </header>

          {error && (
            <div role="alert" className="im-scale-in flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</span>
              <button onClick={load} className="im-btn inline-flex gap-1 rounded-lg bg-white px-3 py-1.5 text-xs text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading interview history">
              {[0, 1, 2].map((i) => (
                <div key={i} className="im-card flex items-center gap-4 p-4">
                  <div className="im-skeleton h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="im-skeleton h-3 w-1/3" />
                    <div className="im-skeleton h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 && !error ? (
            <div className="im-card im-fade-up flex flex-col items-center px-6 py-14 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#5846F6]">
                <FileText className="h-6 w-6" />
              </span>
              <h2 className="text-base font-bold text-slate-900">No interviews yet</h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Upload a document and take your first mock interview. Every question, answer and evaluation will be saved here.
              </p>
              <button onClick={() => navigate('/start-interview')} className="im-btn im-btn-primary mt-5 px-5 py-2.5 text-sm">
                <PlayCircle className="h-4 w-4" /> Start your first interview
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {sessions.map((s, i) => {
                const st = statusOf(s);
                const completed = s.status === 'completed';
                const answered = completed ? s.answeredQuestions ?? null : Math.min(s.currentQuestionIndex ?? 0, s.totalQuestions ?? 0);
                return (
                  <li key={s.id} className="im-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                    <button
                      onClick={() => open(s)}
                      className="im-card im-card-hover group flex w-full items-center gap-4 p-4 text-left"
                    >
                      <ScoreRing value={completed ? s.overallScore : null} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-slate-900">{s.purpose}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${st.tone}`}>{st.label}</span>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-slate-500">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(s.completedAt || s.startedAt)}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[#5846F6]">{s.mode || 'Interview'}</span>
                          <span className="text-slate-300">|</span>
                          <span>
                            {answered === null ? `${s.totalQuestions} questions` : `${answered}/${s.totalQuestions} answered`}
                            {completed && s.missedQuestions > 0 ? ` - ${s.missedQuestions} missed` : ''}
                          </span>
                        </p>
                      </div>
                      <span className="hidden items-center gap-1 text-[11px] font-bold text-[#5846F6] sm:inline-flex">
                        {completed ? <><Repeat2 className="h-3.5 w-3.5" /> Review and practice</> : 'Resume'}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#5846F6]" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
