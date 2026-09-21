import React, { useState, useEffect, useMemo, memo } from 'react';
import Sidebar from '../Sidebar';
import { Briefcase, GraduationCap, ShieldCheck, AlertCircle } from 'lucide-react';
import { listInterviewSessions } from '../../api';

// Reusable Dynamic Metric Badge
const GradeBadge = memo(({ score }) => {
  let label = 'Needs Focus (C)';
  let color = 'text-rose-600 bg-rose-50';

  if (score >= 85) {
    label = 'Excellent (A)';
    color = 'text-emerald-600 bg-emerald-50';
  } else if (score >= 80) {
    label = 'Strong (A-)';
    color = 'text-emerald-600 bg-emerald-50';
  } else if (score >= 75) {
    label = 'Steady (B+)';
    color = 'text-indigo-600 bg-indigo-50';
  } else if (score >= 70) {
    label = 'Average (B)';
    color = 'text-amber-600 bg-amber-50';
  }

  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${color}`}>
      {label}
    </span>
  );
});

export default function CareerAcademic() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load this user's own completed sessions from the backend (JWT-scoped).
  useEffect(() => {
    let isMounted = true;
    listInterviewSessions()
      .then(({ data }) => {
        if (!isMounted) return;
        const completed = (data.sessions || [])
          .filter((s) => s.status === 'completed' && typeof s.overallScore === 'number')
          .map((s) => ({
            id: s.id,
            type: s.purpose,
            score: s.overallScore,
            communication: s.categoryScores?.communication ?? null,
            technical: s.categoryScores?.technicalKnowledge ?? null,
            academicScore: s.overallScore,
            skills: s.categoryScores
              ? {
                  'Technical Knowledge': s.categoryScores.technicalKnowledge,
                  'Communication Under Pressure': s.categoryScores.communication,
                  'Confidence & Delivery': s.categoryScores.confidence,
                  'Answer Relevance': s.categoryScores.answerRelevance,
                  'Structured Answering': s.categoryScores.structuralFlow,
                }
              : null,
          }));
        setSessions(completed);
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

  // Optimized Single-Pass Evaluation Pipeline
  const { metrics, strengths, gaps } = useMemo(() => {
    const targetSessions = sessions;
    const total = targetSessions.length;

    let totalScore = 0;
    let totalComm = 0;
    let totalTech = 0;
    let totalSubject = 0;

    const skillTotals = {};
    const skillCounts = {};

    targetSessions.forEach((s) => {
      totalScore += Number(s.score || 0);
      totalComm += Number(s.communication || 0);
      totalTech += Number(s.technical || 0);
      totalSubject += Number(s.academicScore || s.score || 0);

      // Sessions without real category scores contribute no skill data
      // rather than inventing numbers.
      const skillsObj = s.skills;
      if (!skillsObj) return;

      Object.entries(skillsObj).forEach(([skill, val]) => {
        skillTotals[skill] = (skillTotals[skill] || 0) + Number(val);
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    const avgOverall = Math.round(totalScore / total);
    const avgComm = Math.round(totalComm / total);
    const avgTech = Math.round(totalTech / total);
    const avgSubject = Math.round(totalSubject / total);
    const overallIndex = Math.round((avgOverall + avgComm + avgTech + avgSubject) / 4);

    const evaluatedSkills = Object.keys(skillTotals).map((skill) => ({
      name: skill,
      score: Math.round(skillTotals[skill] / skillCounts[skill]),
    }));

    const topStrengths = evaluatedSkills
      .filter((s) => s.score >= 75)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.name);

    const topGaps = evaluatedSkills
      .filter((s) => s.score < 75)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((s) => s.name);

    return {
      metrics: {
        overallIndex,
        interviewReadiness: avgOverall,
        communication: avgComm,
        technical: avgTech,
        subjectKnowledge: avgSubject,
        resumeReadiness: Math.min(100, Math.round(avgOverall * 0.9)),
        academicPreparation: Math.min(100, Math.round(avgSubject * 0.98)),
      },
      strengths: topStrengths.length
        ? topStrengths
        : ['Data Structures & Algorithms', 'System Design Concepts', 'Technical Problem Solving'],
      gaps: topGaps.length
        ? topGaps
        : ['Behavioral Interview Responses', 'Communication Under Pressure', 'Time Management in Interviews'],
    };
  }, [sessions]);

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Career & Academic Readiness
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Measure your competence against industry and university standards
          </p>
        </div>

        {!loading && sessions.length === 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm text-center space-y-1">
            <p className="text-xs font-bold text-slate-600">No interviews yet</p>
            <p className="text-[10px] text-slate-400 font-medium">
              Complete a mock interview to see your career and academic readiness.
            </p>
          </div>
        )}

        {/* Competence Index & Metric Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Main Competence Index Gauge */}
          <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-6">
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
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
                  strokeDasharray={`${metrics.overallIndex}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-900">{metrics.overallIndex}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  OVERALL
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-extrabold text-slate-900 text-sm">Competence Index</h3>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Your overall proficiency score is computed dynamically across recent session performances.
              </p>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-bold text-slate-400 truncate">Interview Readiness</span>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xl font-black text-slate-900">{metrics.interviewReadiness}%</span>
                <GradeBadge score={metrics.interviewReadiness} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-bold text-slate-400 truncate">Communication</span>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xl font-black text-slate-900">{metrics.communication}%</span>
                <GradeBadge score={metrics.communication} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-bold text-slate-400 truncate">Technical Capability</span>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xl font-black text-slate-900">{metrics.technical}%</span>
                <GradeBadge score={metrics.technical} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-bold text-slate-400 truncate">Subject Knowledge</span>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xl font-black text-slate-900">{metrics.subjectKnowledge}%</span>
                <GradeBadge score={metrics.subjectKnowledge} />
              </div>
            </div>
          </div>
        </div>

        {/* Context Breakdown & Strengths / Gaps */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Evaluated Context Cards */}
          <div className="lg:col-span-6 space-y-3">
            <h3 className="font-extrabold text-xs tracking-wide uppercase text-slate-400">
              Evaluated Contexts
            </h3>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-500">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Resume Readiness</h4>
                  <span className="text-[9px] font-extrabold text-slate-400 tracking-wider block uppercase">
                    JOB-FOCUSED
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-slate-900 block">{metrics.resumeReadiness}%</span>
                <span className="text-[9px] font-extrabold text-amber-500">
                  {metrics.resumeReadiness >= 80 ? 'Optimal' : 'Needs Polish'}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Academic Preparation</h4>
                  <span className="text-[9px] font-extrabold text-slate-400 tracking-wider block uppercase">
                    ACADEMIC-FOCUSED
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-slate-900 block">{metrics.academicPreparation}%</span>
                <span className="text-[9px] font-extrabold text-indigo-500">Comprehensive</span>
              </div>
            </div>
          </div>

          {/* Strengths & Skill Gaps Panel */}
          <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
                <h4 className="font-extrabold text-xs">Strength Areas</h4>
              </div>
              <ul className="space-y-2 text-xs font-bold text-slate-700">
                {strengths.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-amber-500">
                <AlertCircle className="w-4 h-4" />
                <h4 className="font-extrabold text-xs">Identified Skill Gaps</h4>
              </div>
              <ul className="space-y-2 text-xs font-bold text-slate-700">
                {gaps.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Dynamic AI Insights */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-900 text-xs tracking-wide">
            Personalized AI Recommendations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
              <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Job Focus
              </span>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {metrics.communication < 80
                  ? '"Improve behavioral interview answers — practice STAR method responses."'
                  : '"Great behavioral articulation! Keep refining industry domain frameworks."'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
              <span className="text-[9px] font-extrabold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                Academic
              </span>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {metrics.subjectKnowledge < 82
                  ? '"Review fundamental core subjects before your next academic viva."'
                  : '"Academic conceptual hold is high. Practice concise presentation delivery."'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Mixed Insight
              </span>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {`"Your technical performance is at ${metrics.technical}%, but communication is at ${metrics.communication}%. Focus on balanced articulation."`}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}