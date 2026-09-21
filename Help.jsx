import React from 'react';
import Sidebar from '../Sidebar';
import { HelpCircle, ChevronRight, Mail, BookOpen, ShieldCheck } from 'lucide-react';

export default function Help() {
  const faqs = [
    { q: 'How does the Mock Interview generate questions?', a: 'When you upload a document in "Set Up Your AI Evaluation", InterviewMate extracts its text (and, for PDFs, its diagrams/charts too) and sends it to Gemini along with your chosen purpose, type, difficulty and level - so every question is grounded in your actual material and configuration, not a fixed question bank.' },
    { q: 'What document types can I upload?', a: 'PDF, DOCX and PPTX are supported. Images and diagrams embedded in the document are analyzed alongside the text where possible.' },
    { q: 'Is my uploaded document secure?', a: "Documents are processed to extract their content for your interview session and stored under your account only - other users can never see your documents, sessions, or results." },
    { q: 'Do I need to verify my email every time I log in?', a: 'No. Email verification (OTP) only happens once, during signup. After that, logging in only requires your email and password.' },
    { q: 'Can I sign in with Google or GitHub?', a: 'Yes, if the site owner has configured OAuth for those providers. If a button is disabled, that provider hasn\'t been set up yet.' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Help & Knowledge Base <HelpCircle className="w-5 h-5 text-[#5846F6]" />
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Find answers to common questions or reach out to our support team.
          </p>
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <BookOpen className="w-6 h-6 text-[#5846F6]" />
            <h3 className="text-xs font-black text-slate-800">Documentation</h3>
            <p className="text-[11px] text-slate-400">Read system guides & practice rules.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <ShieldCheck className="w-6 h-6 text-[#5846F6]" />
            <h3 className="text-xs font-black text-slate-800">Privacy & Terms</h3>
            <p className="text-[11px] text-slate-400">Learn how we handle your academic data.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <Mail className="w-6 h-6 text-[#5846F6]" />
            <h3 className="text-xs font-black text-slate-800">Direct Support</h3>
            <p className="text-[11px] text-slate-400">Use the Feedback page in the sidebar to reach the team.</p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-[#5846F6]" /> {faq.q}
                </h4>
                <p className="text-[11px] text-slate-500 pl-5 font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}