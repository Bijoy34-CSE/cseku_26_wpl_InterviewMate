import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Sparkles, ChevronDown, ChevronUp, Loader2, ShieldAlert, RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getSessionFeedback, practiceAgainQuestion } from '../../api';

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

  // { [questionId]: 'answer' | 'feedback' | 'suggested' | 'practice' | null }
  const [expanded, setExpanded] = useState({});

  // Practice Again state, keyed by questionId - a fresh answer attempt at
  // the same question, scored through the same Gemini flow, kept separate
  // from the original interview's answer/score.
  const [practiceDrafts, setPracticeDrafts] = useState({});
  const [practiceSubmitting, setPracticeSubmitting] = useState({});
  const [practiceResults, setPracticeResults] = useState({});
  const [practiceErrors, setPracticeErrors] = useState({});

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

  const handlePracticeSubmit = async (sessionId, questionId) => {
    const draft = (practiceDrafts[questionId] || '').trim();
    if (!draft) return;

    setPracticeSubmitting((prev) => ({ ...prev, [questionId]: true }));
    setPracticeErrors((prev) => ({ ...prev, [questionId]: '' }));

    try {
      const { data: resp } = await practiceAgainQuestion(sessionId, questionId, draft);
      setPracticeResults((prev) => ({ ...prev, [questionId]: resp }));
    } catch (err) {
      setPracticeErrors((prev) => ({
        ...prev,
        [questionId]: err.response?.data?.message || 'Could not score this attempt. Please try again.',
      }));
    } finally {
      setPracticeSubmitting((prev) => ({ ...prev, [questionId]: false }));
    }
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
              Detailed AI assessment of this completed interview session.
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
                const hasScore = Boolean(q.score);
                const hasAnswer = typeof q.answerText === 'string' && q.answerText.trim().length > 0;
                const isUnanswered = !hasAnswer;
                const status = hasScore
                  ? getStatusMeta(q.score.overall)
                  : { label: 'Skipped / No Answer', style: 'bg-slate-100 text-slate-500' };
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

                    {isUnanswered ? (
                      <div className="space-y-3 border-t border-slate-50 pt-4">
                        <section className="space-y-2 rounded-xl bg-indigo-50/70 p-3">
                          <h5 className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">AI Feedback</h5>
                          <p className="text-[11px] font-medium leading-relaxed text-slate-700">
                            {q.missedGuidance?.aiFeedback || 'AI feedback is unavailable for this question right now. Reopen the results after AI service is available to try again.'}
                          </p>
                        </section>
                        <section className="space-y-2 rounded-xl bg-slate-50 p-3">
                          <h5 className="text-[10px] font-extrabold uppercase tracking-wide text-[#5846F6]">Suggested Better Answer</h5>
                          <p className="text-[11px] font-medium leading-relaxed text-slate-700 whitespace-pre-line">
                            {q.missedGuidance?.suggestedAnswer || 'A suggested answer could not be generated yet. Reopen the results after AI service is available to try again.'}
                          </p>
                        </section>
                      </div>
                    ) : (
                      <>
                        {/* Dropdown Options */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-50 pt-3 text-[11px] font-bold text-slate-500">
                          <button
                            onClick={() => toggleSection(q.questionId, 'answer')}
                            className="flex items-center gap-1 hover:text-[#5846F6] transition-colors"
                          >
                            <span>View Answer</span>
                            {openSection === 'answer' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => toggleSection(q.questionId, 'feedback')}
                            disabled={!hasScore}
                            className="flex items-center gap-1 hover:text-[#5846F6] transition-colors disabled:text-slate-300 disabled:cursor-not-allowed"
                          >
                            <span>AI Feedback</span>
                            {openSection === 'feedback' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => toggleSection(q.questionId, 'suggested')}
                            disabled={!hasScore}
                            className="flex items-center gap-1 hover:text-[#5846F6] transition-colors disabled:text-slate-300 disabled:cursor-not-allowed"
                          >
                            <span>Suggested Better Answer</span>
                            {openSection === 'suggested' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          {hasScore && (
                            <button
                              onClick={() => toggleSection(q.questionId, 'practice')}
                              className="flex items-center gap-1 hover:text-[#5846F6] transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Practice Again</span>
                              {openSection === 'practice' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {openSection === 'answer' && (
                          <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl">
                            {q.answerText}
                          </p>
                        )}
                        {openSection === 'feedback' && hasScore && (
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
                              {q.score.aiFeedback}
                            </p>
                          </div>
                        )}
                        {openSection === 'suggested' && hasScore && (
                          <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl">
                            {q.score.suggestedAnswer}
                          </p>
                        )}
                      </>
                    )}
                    {openSection === 'practice' && (
                      <div className="bg-slate-50 p-3 rounded-xl space-y-3">
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          Same question - answer it again and get a fresh, document-grounded evaluation.
                        </p>
                        <textarea
                          value={practiceDrafts[q.questionId] || ''}
                          onChange={(e) =>
                            setPracticeDrafts((prev) => ({ ...prev, [q.questionId]: e.target.value }))
                          }
                          placeholder="Type your new answer..."
                          rows={4}
                          className="w-full text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                        />
                        {practiceErrors[q.questionId] && (
                          <p className="text-[11px] text-rose-500 font-semibold">{practiceErrors[q.questionId]}</p>
                        )}
                        <button
                          onClick={() => handlePracticeSubmit(sessionId, q.questionId)}
                          disabled={practiceSubmitting[q.questionId] || !(practiceDrafts[q.questionId] || '').trim()}
                          className="flex items-center gap-1.5 bg-[#5846F6] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
                        >
                          {practiceSubmitting[q.questionId] ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating...
                            </>
                          ) : (
                            'Submit New Answer'
                          )}
                        </button>

                        {practiceResults[q.questionId] && (() => {
                          const result = practiceResults[q.questionId];
                          const attempt = result.attempt;
                          const TrendIcon = result.delta > 0 ? TrendingUp : result.delta < 0 ? TrendingDown : Minus;
                          const trendColor = result.delta > 0 ? 'text-emerald-600' : result.delta < 0 ? 'text-rose-500' : 'text-slate-400';

                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-xs font-bold">
                                  <span className="text-slate-400">Previous: {result.previousScore}%</span>
                                  <span className="text-slate-900">New: {attempt.overall}%</span>
                                </div>
                                <span className={`flex items-center gap-1 text-[10px] font-extrabold ${trendColor}`}>
                                  <TrendIcon className="w-3.5 h-3.5" />
                                  {result.delta > 0 ? `+${result.delta}` : result.delta}
                                </span>
                              </div>

                              {attempt.strengths?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-extrabold text-emerald-600 mb-1">What Improved</p>
                                  <ul className="list-disc list-inside text-[11px] text-slate-600 font-medium space-y-0.5">
                                    {attempt.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                              )}
                              {attempt.missingPoints?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-extrabold text-rose-500 mb-1">Still Missing</p>
                                  <ul className="list-disc list-inside text-[11px] text-slate-600 font-medium space-y-0.5">
                                    {attempt.missingPoints.map((s, i) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] font-extrabold text-indigo-600 mb-1">Better Answer</p>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{attempt.suggestedAnswer}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
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
