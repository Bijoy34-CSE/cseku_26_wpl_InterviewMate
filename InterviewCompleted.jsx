import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Check, Loader2, ShieldAlert } from 'lucide-react';
import { getSessionFeedback } from '../../api';

export default function InterviewCompleted() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = location.state?.sessionId || null;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard', { replace: true });
      return;
    }

    (async () => {
      try {
        const { data: resp } = await getSessionFeedback(sessionId);
        setData(resp);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load your results.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sessionId, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-[#5846F6] animate-spin" />
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-xs flex items-center gap-2 max-w-md">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error || 'Something went wrong loading this session.'}</span>
          </div>
        </main>
      </div>
    );
  }

  const { session, feedback, breakdown } = data;
  const overall = feedback.overallScore;
  const cs = feedback.categoryScores;

  const metrics = [
    { label: 'Communication', value: cs.communication, bar: 'bg-[#5846F6]' },
    { label: 'Technical Knowledge', value: cs.technicalKnowledge, bar: 'bg-sky-400' },
    { label: 'Confidence', value: cs.confidence, bar: 'bg-amber-400' },
    { label: 'Answer Relevance', value: cs.answerRelevance, bar: 'bg-emerald-500' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        {/* Top Header */}
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Interview Finished
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Your evaluation is ready for review.
          </p>
        </div>

        {/* Outer White Completed Card */}
        <div className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm max-w-5xl mx-auto space-y-10">
          
          {/* Header Title & Subtitle Section */}
          <div className="text-center space-y-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${session.timedOut ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {session.timedOut ? 'Interview Timed Out' : 'Interview Completed!'}
            </h1>
            {session.timedOut && (
              <p className="text-xs font-bold text-amber-600">
                Time ran out - {session.currentQuestionIndex} of {session.totalQuestions} questions answered
                {typeof session.completionRate === 'number' && ` (${session.completionRate}% completion rate)`}.
              </p>
            )}
            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
              {feedback.assessment}
            </p>
          </div>

          {/* Circle Score & Session Details Grid */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 pt-2 pb-6 border-b border-slate-100">
            {/* Donut Progress Chart */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Active Ring */}
                <path
                  className="text-[#5846F6]"
                  strokeDasharray={`${overall}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900">{overall}%</span>
              </div>
            </div>

            {/* Session Details List */}
            <div className="space-y-2.5 text-xs">
              <div className="uppercase tracking-wider text-[10px] font-black text-slate-400 mb-3">
                SESSION DETAILS
              </div>
              <div className="flex items-center gap-6">
                <span className="text-slate-400 font-semibold w-32">Role Template</span>
                <span className="font-extrabold text-slate-900">{session.purpose}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-slate-400 font-semibold w-32">Interview Type</span>
                <span className="font-extrabold text-[#5846F6]">{session.type}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-slate-400 font-semibold w-32">Questions Answered</span>
                <span className="font-extrabold text-slate-900">{breakdown.length} of {session.totalQuestions} questions</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-slate-400 font-semibold w-32">Duration</span>
                <span className="font-extrabold text-slate-900">{session.durationLabel}</span>
              </div>
            </div>
          </div>

          {/* 4 Performance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-[#F8F9FD] p-4 rounded-2xl border border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 block">{m.label}</span>
                <span className="text-2xl font-black text-slate-900 block">{m.value}%</span>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${m.bar} rounded-full`} style={{ width: `${m.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/feedback-results', { state: { sessionId } })}
              className="w-full sm:w-auto px-8 py-3 bg-[#5846F6] hover:bg-[#4735E5] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95"
            >
              View Detailed Feedback
            </button>
            <button
              onClick={() => navigate('/start-interview')}
              className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-95"
            >
              Try Another Interview
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
