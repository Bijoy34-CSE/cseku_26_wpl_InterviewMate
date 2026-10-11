import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import {
  Briefcase,
  BookOpen,
  FileText,
  Award,
  Upload,
  X,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import FileTypeIcon from '../FileTypeIcon';
import { createInterviewSession, getPlanStatus } from '../../api';
import { useUser } from '../../context/UserContext';

const purposeOptions = [
  {
    id: 'Job Interview',
    title: 'Job Interview',
    description: 'Technical and behavioral interview preparation.',
    icon: Briefcase,
    iconColor: 'text-sky-600 bg-sky-50',
  },
  {
    id: 'Academic Viva',
    title: 'Academic (Course / Subject / Lab) Viva',
    description: 'Course, subject, syllabus, and lab viva preparation.',
    icon: BookOpen,
    iconColor: 'text-violet-600 bg-violet-50',
  },
  {
    id: 'Internship Interview',
    title: 'Internship Interview',
    description: 'Entry-level technical and learning-focused interviews.',
    icon: FileText,
    iconColor: 'text-emerald-600 bg-emerald-50',
  },
  {
    id: 'Thesis Defense',
    title: 'Thesis Defense',
    description: 'Defend your research question, methods, findings, and limitations.',
    icon: Award,
    iconColor: 'text-amber-600 bg-amber-50',
  },
];

const difficulties = ['Easy', 'Intermediate', 'Hard'];
const levels = ['Beginner', 'Entry-Level', 'Mid-Level', 'Advanced'];
const durations = ['5 Mins', '10 Mins', '15 Mins', '20 Mins', '30 Mins'];
const questionCounts = ['5 Questions', '10 Questions', '15 Questions', '20 Questions'];
const modes = ['Audio + Video', 'Audio Only', 'Text Response'];

export default function StartInterview() {
  const navigate = useNavigate();
  const { user } = useUser();
  const preferences = user?.preferences || {};
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getPlanStatus()
      .then(({ data: plan }) => {
        if (active && plan.plan !== 'premium' && plan.freeSessionsRemaining === 0) {
          navigate('/upgrade?reason=free-limit', { replace: true });
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Could not check your interview plan.');
      });
    return () => { active = false; };
  }, [navigate]);
  const preferredDifficulty = preferences.difficulty === 'Medium'
    ? 'Intermediate'
    : ['Easy', 'Intermediate', 'Hard'].includes(preferences.difficulty)
      ? preferences.difficulty
      : 'Intermediate';
  const preferredQuestions = ['5 Questions', '10 Questions', '15 Questions', '20 Questions'].includes(preferences.questionCount)
    ? preferences.questionCount
    : '10 Questions';
  const preferredMode = preferences.modalityMode === 'text' ? 'Text Response' : 'Audio Only';

  const [formData, setFormData] = useState({
    purpose: 'Job Interview',
    customPurpose: '',
    difficulty: preferredDifficulty,
    level: 'Mid-Level',
    duration: '15 Mins',
    questions: preferredQuestions,
    mode: preferredMode,
    adaptiveDifficulty: preferences.adaptiveDifficulty !== false,
    materials: null,
  });
  const title = purposeOptions.find((option) => option.id === formData.purpose)?.title || formData.purpose;

  const update = (key, value) => {
    setFormData((previous) => ({ ...previous, [key]: value }));
    setError('');
  };

  const handlePurposeChange = (purpose) => {
    setFormData((previous) => ({ ...previous, purpose }));
    setError('');
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = /\.(pdf|docx|pptx)$/i.test(file.name);
    if (!allowed) {
      setError('Please upload a PDF, DOCX, or PPTX document.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('The document must be 10MB or smaller.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setFormData((previous) => ({ ...previous, materials: file.name }));
    setError('');
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFormData((previous) => ({ ...previous, materials: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startInterview = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const { data: plan } = await getPlanStatus();
      if (plan.plan !== 'premium' && plan.freeSessionsRemaining === 0) {
        navigate('/upgrade?reason=free-limit');
        return;
      }

      if (!selectedFile) {
        setError('Upload the document you want InterviewMate to use as the only knowledge source for this Mock Interview.');
        return;
      }

      const minutes = parseInt(formData.duration, 10);
      const count = parseInt(formData.questions, 10);
      if ((minutes * 60) / count < 30) {
        setError(`${count} questions need at least ${Math.ceil((count * 30) / 60)} minutes (about 30 seconds each). Increase the duration or reduce the question count.`);
        return;
      }

      if (!formData.purpose || !formData.difficulty || !formData.level || !formData.duration || !formData.questions || !formData.mode) {
        setError('Complete every interview setting before starting.');
        return;
      }

      const { data } = await createInterviewSession(formData, selectedFile);
      localStorage.setItem('active_session_id', data.session.id);
      navigate('/mock-interviews', {
        state: {
          sessionId: data.session.id,
          question: data.question,
          session: data.session,
        },
      });
    } catch (requestError) {
      if (requestError.response?.status === 402 && requestError.response?.data?.code === 'FREE_LIMIT_REACHED') {
        navigate('/upgrade?reason=free-limit');
      } else {
        setError(requestError.response?.data?.message || 'Could not start the interview session. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] text-slate-800 antialiased">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#5846F6]">
                <Sparkles className="h-3.5 w-3.5" /> AI Adaptive Engine
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Set Up Your Interview</h1>
              <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-slate-500">
                Configure the complete interview in one place. Your uploaded document remains the grounding source for every Mock Interview question.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Question source</p>
              <p className="mt-1 text-xs font-extrabold text-slate-900">Uploaded material only</p>
            </div>
          </header>

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-sm font-black text-slate-900">Purpose</h2>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">Choose what the interview is intended to prepare you for.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {purposeOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = formData.purpose === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handlePurposeChange(option.id)}
                        className={`rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${selected ? 'border-[#5846F6] bg-indigo-50/70 ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
                      >
                        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${option.iconColor}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <p className="text-xs font-black text-slate-900">{option.title}</p>
                        <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-500">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
                {formData.purpose === 'Job Interview' && (
                  <input
                    value={formData.customPurpose}
                    onChange={(event) => update('customPurpose', event.target.value)}
                    placeholder="Optional: specific role or interview focus"
                    className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                )}
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-sm font-black text-slate-900">Interview Configuration</h2>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">Every setting below is sent to the backend and used by the adaptive pipeline.</p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <SelectField label="Difficulty" value={formData.difficulty} options={difficulties} onChange={(value) => update('difficulty', value)} />
                    <SelectField label="Level" value={formData.level} options={levels} onChange={(value) => update('level', value)} />
                    <SelectField label="Duration" value={formData.duration} options={durations} onChange={(value) => update('duration', value)} />
                    <SelectField label="Question Count" value={formData.questions} options={questionCounts} onChange={(value) => update('questions', value)} />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">Mode</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {modes.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => update('mode', option)}
                          className={`rounded-xl border px-3 py-3 text-xs font-extrabold transition ${formData.mode === option ? 'border-[#5846F6] bg-indigo-50 text-[#5846F6]' : 'border-slate-200 text-slate-700 hover:border-indigo-200'}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <h2 className="text-sm font-black text-slate-900">Materials / Document</h2>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">
                    Required for Mock Interview. Questions are generated and evaluated against this material rather than a generic question bank.
                  </p>
                </div>

                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx" onChange={handleFileChange} className="hidden" />

                {!selectedFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center transition hover:border-indigo-300 hover:bg-indigo-50/30"
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-[#5846F6]">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black text-slate-800">Upload PDF, DOCX or PPTX</span>
                    <span className="mt-1 text-[10px] font-medium text-slate-400">Maximum 10MB</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                        <FileTypeIcon filename={selectedFile.name} className="h-7 w-7" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold text-slate-900">{selectedFile.name}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button type="button" onClick={removeFile} className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-rose-500" aria-label="Remove document">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </section>

            <aside className="h-fit space-y-4 xl:sticky xl:top-6">
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <div className="bg-slate-950 p-5 text-white">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-300">
                    <Sparkles className="h-3.5 w-3.5" /> Adaptive Engine
                  </div>
                  <h3 className="mt-2 text-lg font-black">Ready to personalize the interview.</h3>
                  <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-300">
                    Your configuration, document, previous answers and evaluation signals drive the next question.
                  </p>
                </div>
                <div className="space-y-3 p-5">
                  <SummaryRow label="Purpose" value={title} />
                  <SummaryRow label="Difficulty" value={formData.difficulty} />
                  <SummaryRow label="Level" value={formData.level} />
                  <SummaryRow label="Duration" value={formData.duration} />
                  <SummaryRow label="Questions" value={formData.questions} />
                  <SummaryRow label="Mode" value={formData.mode} />
                  <SummaryRow label="Document" value={formData.materials || 'Required'} />
                </div>
              </div>

              <button
                type="button"
                onClick={startInterview}
                disabled={isSubmitting}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] px-5 py-3.5 text-xs font-black text-white shadow-lg shadow-blue-200 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Preparing Interview...' : 'Start AI Interview'}
                {!isSubmitting && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
              </button>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-[10px] font-semibold text-slate-400">{label}</span>
      <span className="max-w-[62%] truncate text-right text-[10px] font-extrabold text-slate-800">{value}</span>
    </div>
  );
}
