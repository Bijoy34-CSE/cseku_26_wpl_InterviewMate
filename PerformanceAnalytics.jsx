import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../Sidebar';
import { listInterviewSessions } from '../../api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function PerformanceAnalytics() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [rawSessions, setRawSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load this user's real completed sessions from the backend. Scoped to the
  // authenticated user by JWT - no shared/mock dataset.
  useEffect(() => {
    let isMounted = true;
    listInterviewSessions()
      .then(({ data }) => {
        if (!isMounted) return;
        const completed = (data.sessions || [])
          .filter((s) => s.status === 'completed' && typeof s.overallScore === 'number')
          .reverse() // oldest first, so the trend chart reads left-to-right
          .map((s) => ({
            id: s.id,
            type: s.purpose,
            title: s.type,
            score: s.overallScore,
            communication: s.categoryScores?.communication ?? null,
            technical: s.categoryScores?.technicalKnowledge ?? null,
            skills: s.categoryScores
              ? {
                  'Communication & Presentation': s.categoryScores.communication,
                  'Technical Knowledge': s.categoryScores.technicalKnowledge,
                  'Confidence & Delivery': s.categoryScores.confidence,
                  'Answer Relevance': s.categoryScores.answerRelevance,
                  'Structured Answering': s.categoryScores.structuralFlow,
                }
              : null,
          }));
        setRawSessions(completed);
      })
      .catch(() => {
        if (isMounted) setRawSessions([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filterTabs = ['All', 'Job Interview', 'Academic', 'Internship'];

  // Smart Filter Logic: Case-insensitive & Partial Matching
  const filteredSessions = useMemo(() => {
    if (activeFilter === 'All') return rawSessions;

    const targetFilter = activeFilter.toLowerCase().trim();

    return rawSessions.filter((s) => {
      const type = (s.type || s.tag || s.category || '').toLowerCase().trim();
      return type.includes(targetFilter) || targetFilter.includes(type);
    });
  }, [rawSessions, activeFilter]);

  // Calculations for Stat Cards
  const totalInterviews = filteredSessions.length;

  const averageScore = useMemo(() => {
    if (totalInterviews === 0) return 0;
    const sum = filteredSessions.reduce((acc, curr) => acc + Number(curr.score || 0), 0);
    return Math.round(sum / totalInterviews);
  }, [filteredSessions, totalInterviews]);

  const highestScore = useMemo(() => {
    if (totalInterviews === 0) return 0;
    return Math.max(...filteredSessions.map((s) => Number(s.score || 0)));
  }, [filteredSessions, totalInterviews]);

  const currentStreak = useMemo(() => totalInterviews, [totalInterviews]);

  // Chart Data Mapper with Single-Session Protection
  const performanceData = useMemo(() => {
    if (filteredSessions.length === 0) return [];

    // Only real, AI-produced numbers are plotted - nothing is estimated or
    // back-filled with a synthetic baseline point.
    return filteredSessions.map((session, index) => ({
      name: session.title
        ? `S${index + 1}: ${session.title.length > 12 ? session.title.slice(0, 10) + '..' : session.title}`
        : `Session ${index + 1}`,
      Overall: Number(session.score || 0),
      Communication: session.communication ?? null,
      Technical: session.technical ?? null,
    }));
  }, [filteredSessions]);

  // Dynamic Skill Analysis based on current Filter Data
  const { strongestSkills, skillsToImprove } = useMemo(() => {
    if (filteredSessions.length === 0) {
      return { strongestSkills: [], skillsToImprove: [] };
    }

    const skillTotals = {};
    const skillCounts = {};

    filteredSessions.forEach((s) => {
      // Sessions without real per-category scores contribute nothing rather
      // than inventing plausible-looking numbers.
      const sessionSkills = s.skills;
      if (!sessionSkills) return;

      Object.entries(sessionSkills).forEach(([skill, val]) => {
        skillTotals[skill] = (skillTotals[skill] || 0) + Number(val);
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    const calculatedSkills = Object.keys(skillTotals).map((skill) => ({
      name: skill,
      score: Math.min(100, Math.round(skillTotals[skill] / skillCounts[skill])),
    }));

    calculatedSkills.sort((a, b) => b.score - a.score);

    const half = Math.ceil(calculatedSkills.length / 2);
    const top = calculatedSkills.slice(0, Math.min(3, half));
    const bottom = calculatedSkills.slice(-Math.min(3, half)).reverse();

    return {
      strongestSkills: top,
      skillsToImprove: bottom,
    };
  }, [filteredSessions]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        {/* Header & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Performance Analytics
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Track your progress, cohort ranking, and key growth indicators.
            </p>
          </div>

          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 self-start sm:self-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {!loading && rawSessions.length === 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-1">
            <p className="text-xs font-bold text-slate-600">No interviews yet</p>
            <p className="text-[10px] text-slate-400 font-medium">
              Complete a mock interview to start building your performance analytics.
            </p>
          </div>
        )}

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Total Interviews</span>
            <span className="text-2xl font-black text-slate-900 block">{totalInterviews} Sessions</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Average Score</span>
            <span className="text-2xl font-black text-slate-900 block">{averageScore}%</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Highest Score</span>
            <span className="text-2xl font-black text-slate-900 block">{highestScore}%</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">Completed Sessions</span>
            <span className="text-2xl font-black text-slate-900 block">{currentStreak}</span>
          </div>
        </div>

        {/* Improved Performance Chart Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Performance Over Time</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Evaluation score growth across consecutive sessions ({activeFilter})
              </p>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5846F6]"></span>
                Overall
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                Communication
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Technical / Domain
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={performanceData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5846F6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#5846F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTech" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Overall"
                    stroke="#5846F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOverall)"
                    dot={{ r: 4, fill: '#5846F6' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Communication"
                    stroke="#14B8A6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorComm)"
                    dot={{ r: 3, fill: '#14B8A6' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Technical"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTech)"
                    dot={{ r: 3, fill: '#10B981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                <span className="text-xs font-semibold">No interviews completed in "{activeFilter}" yet.</span>
                <span className="text-[10px]">Start a mock interview in this category to view analytics.</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Skills Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strongest Skills */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">Strongest Skills</h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                Top Areas
              </span>
            </div>

            <div className="space-y-4">
              {strongestSkills.length > 0 ? (
                strongestSkills.map((skill) => (
                  <div key={skill.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-800">{skill.name}</span>
                      <span className="text-emerald-500">{skill.score}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${skill.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 font-medium">No data found for this category.</p>
              )}
            </div>
          </div>

          {/* Skills to Improve */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">Skills to Improve</h3>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                Improvement Focus
              </span>
            </div>

            <div className="space-y-4">
              {skillsToImprove.length > 0 ? (
                skillsToImprove.map((skill) => (
                  <div key={skill.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-800">{skill.name}</span>
                      <span className="text-amber-500">{skill.score}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${skill.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 font-medium">No improvement areas recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}