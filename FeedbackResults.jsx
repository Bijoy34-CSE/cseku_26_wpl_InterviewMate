import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Sparkles, ChevronDown, ChevronUp, Loader2, ShieldAlert } from 'lucide-react';
import { getSessionFeedback } from '../../api';

function getStatusMeta(overall) {
  if (overall >= 90) return { label: `Excellent (${overall}%)`, style: 'bg-sky-50 text-sky-600' };
  if (overall >= 75) return { label: `Strong (${overall}%)`, style: 'bg-emerald-50 text-emerald-600' };
  return { label: `Needs Improvement (${overall}%)`, style: 'bg-rose-50 text-rose-500' };
}

export default function FeedbackResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = location.state?.sessionId || null;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // { [questionId]: 'answer' | 'feedback' | 'suggested' | null }
  const [expanded, setExpanded] = useState({});

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
        setError(err.response?.data?.message || 'Could not load feedback for this session.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sessionId, navigate]);

  const toggleSection = (questionId, section) => {
    setExpanded((prev) => ({
      ...prev,
      [questionId]: prev[questionId] === section ? null : section,
    }));
  };

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

  const { feedback, breakdown } = data;
  const cs = feedback.categoryScores;

  const bars = [
    { label: 'Technical Accuracy', value: cs.technicalAccuracy, bar: 'bg-sky-400' },
    { label: 'Structural Flow', value: cs.structuralFlow, bar: 'bg-[#5846F6]' },
    { label: 'Delivery & Pace', value: cs.deliveryPace, bar: 'bg-emerald-500' },
  ];

  const strengths = feedback.strengths.length > 0 ? feedback.strengths : ['No standout strengths identified for this session yet.'];
  const improvements = feedback.improvements.length > 0 ? feedback.improvements : ['Keep practicing to surface areas to improve.'];

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Evaluation & Feedback
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Detailed AI assessment of your software engineering mock session.
            </p>
          </div>

          <button
            onClick={() => navigate('/start-interview')}
            className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-[#5846F6] font-bold text-xs rounded-xl transition-all active:scale-95 self-start sm:self-auto"
          >
            Retake Session
          </button>
        </div>

        {/* 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (Overall Scores & Assessment) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Score Overview Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm">Score Overview</h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-8 pt-2">
                {/* Overall % Circle */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#5846F6]"
                      strokeDasharray={`${feedback.overallScore}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900">{feedback.overallScore}%</span>
                  </div>
                </div>

                {/* Progress Bars List */}
                <div className="w-full space-y-3.5">
                  {bars.map((b) => (
                    <div key={b.label} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500">{b.label}</span>
                        <span className="text-slate-900">{b.value}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${b.bar} rounded-full`} style={{ width: `${b.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dr. Ava's Assessment Banner */}
            <div className="bg-[#EEEDFE] p-6 rounded-3xl border border-indigo-100/50 space-y-3">
              <div className="flex items-center gap-2 text-[#5846F6]">
                <div className="p-1.5 bg-[#5846F6] text-white rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-xs">Dr. Ava's Assessment</h4>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                "{feedback.assessment}"
              </p>
            </div>

            {/* Strengths & Areas to Improve Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                <span className="text-[11px] font-black uppercase text-emerald-600 tracking-wider block">
                  STRENGTHS
                </span>
                <ul className="space-y-2 text-xs font-semibold text-slate-600">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to Improve */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                <span className="text-[11px] font-black uppercase text-amber-500 tracking-wider block">
                  AREAS TO IMPROVE
                </span>
                <ul className="space-y-2 text-xs font-semibold text-slate-600">
                  {improvements.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* Right Column (Question Breakdown List) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Question Breakdown</h3>

            <div className="space-y-3">
              {breakdown.map((q) => {
                const status = q.score ? getStatusMeta(q.score.overall) : { label: 'Skipped', style: 'bg-slate-100 text-slate-500' };
                const openSection = expanded[q.questionId];

                return (
                  <div
                    key={q.questionId}
                    className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider block">
                        QUESTION {q.index + 1}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md shrink-0 ${status.style}`}>
                        {status.label}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                      {q.questionText}
                    </h4>

                    {/* Dropdown Options */}
                    <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 pt-1 border-t border-slate-50">
                      <button
                        onClick={() => toggleSection(q.questionId, 'answer')}
                        className="flex items-center gap-1 hover:text-[#5846F6] transition-colors"
                      >
                        <span>View Answer</span>
                        {openSection === 'answer' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => toggleSection(q.questionId, 'feedback')}
                        className="flex items-center gap-1 hover:text-[#5846F6] transition-colors"
                      >
                        <span>AI Feedback</span>
                        {openSection === 'feedback' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => toggleSection(q.questionId, 'suggested')}
                        className="flex items-center gap-1 hover:text-[#5846F6] transition-colors"
                      >
                        <span>Suggested Better Answer</span>
                        {openSection === 'suggested' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {openSection === 'answer' && (
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl">
                        {q.answerText || 'No answer was submitted for this question.'}
                      </p>
                    )}
                    {openSection === 'feedback' && (
                      <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                        {q.score?.strengths?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-extrabold text-emerald-600 mb-1">Strengths</p>
                            <ul className="list-disc list-inside text-[11px] text-slate-600 font-medium space-y-0.5">
                              {q.score.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {q.score?.weaknesses?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-extrabold text-amber-600 mb-1">Weaknesses</p>
                            <ul className="list-disc list-inside text-[11px] text-slate-600 font-medium space-y-0.5">
                              {q.score.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {q.score?.missingPoints?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-extrabold text-rose-500 mb-1">Missing From Your Answer</p>
                            <ul className="list-disc list-inside text-[11px] text-slate-600 font-medium space-y-0.5">
                              {q.score.missingPoints.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          {q.score ? q.score.aiFeedback : 'No feedback available.'}
                        </p>
                      </div>
                    )}
                    {openSection === 'suggested' && (
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl">
                        {q.score ? q.score.suggestedAnswer : 'No suggested answer available.'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
