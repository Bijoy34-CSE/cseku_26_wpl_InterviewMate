import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Users, MessageCircle, Lightbulb, TrendingUp, ExternalLink } from 'lucide-react';

const TIPS = [
  {
    title: 'Structure answers with STAR',
    body: 'For behavioral questions, walk through the Situation, Task, Action, and Result. It keeps your answer focused and easy to follow.',
    tag: 'Behavioral',
  },
  {
    title: 'Think out loud in technical vivas',
    body: "Examiners often care more about your reasoning than the final answer. Narrate your thought process as you work through a problem.",
    tag: 'Academic',
  },
  {
    title: 'Re-read the feedback, not just the score',
    body: 'The number tells you how you did; the written feedback tells you what to actually change before your next session.',
    tag: 'General',
  },
  {
    title: 'Upload the real material you were assigned',
    body: 'Questions are generated from whatever document you upload - a real syllabus, slide deck, or resume gives far more relevant practice than a generic one.',
    tag: 'Setup',
  },
];

export default function Community() {
  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Community <Users className="w-5 h-5 text-[#5846F6]" />
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Practical tips for getting the most out of your interview and viva prep.
          </p>
        </div>

        {/* Tip cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TIPS.map((tip) => (
            <div key={tip.title} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span className="text-[9px] font-extrabold text-[#5846F6] bg-indigo-50 px-2 py-0.5 rounded-md">{tip.tag}</span>
              </div>
              <h3 className="text-xs font-black text-slate-800">{tip.title}</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{tip.body}</p>
            </div>
          ))}
        </div>

        {/* Honest "coming soon" for the social layer, rather than faking live posts/members */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#5846F6]" />
            <h3 className="text-sm font-black text-slate-900">Discussions &amp; peer feedback</h3>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            A place to share mock interview experiences and swap feedback with other candidates is on the
            roadmap. In the meantime, have an idea for what this should look like?
          </p>
          <Link
            to="/feedback"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5846F6] hover:underline"
          >
            Suggest it on the Feedback page <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-3xl border border-indigo-100 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-[#5846F6]" />
          </div>
          <p className="text-xs font-semibold text-slate-600">
            Your own progress lives on the <Link to="/performance" className="font-bold text-[#5846F6] hover:underline">Performance</Link> page -
            it's the fastest way to see which topics need another round of practice.
          </p>
        </div>
      </main>
    </div>
  );
}
