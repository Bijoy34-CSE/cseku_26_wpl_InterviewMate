import React, { useState } from 'react';
import Sidebar from '../Sidebar';
import { MessageSquarePlus, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { submitSiteFeedback } from '../../api';

const CATEGORIES = ['General Feedback', 'Bug Report', 'Feature Request', 'Praise'];

export default function Feedback() {
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please write a message before submitting.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await submitSiteFeedback({ category, rating, message: message.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans">
      <Sidebar />
      <main className="flex-1 p-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Send Feedback <MessageSquarePlus className="w-5 h-5 text-[#5846F6]" />
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Have a suggestion or found an issue? Let us know how we can improve InterviewMate.
          </p>
        </div>

        {submitted ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900">Thank you for your feedback!</h3>
            <p className="text-xs text-slate-500 font-medium">Your insights help us build a better platform for everyone.</p>
            <button
              onClick={() => { setSubmitted(false); setMessage(''); setRating(5); setCategory(CATEGORIES[0]); }}
              className="mt-2 px-4 py-2 bg-indigo-50 text-[#5846F6] font-bold text-xs rounded-xl"
            >
              Send Another Response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">How would you rate your experience?</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                      rating === star ? 'bg-[#5846F6] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {star} ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Feedback Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-[#5846F6]"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Your Message</label>
              <textarea
                rows="4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                placeholder="Tell us what you loved or what needs improvement..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-[#5846F6]"
                required
              />
            </div>

            {error && <p className="text-xs font-bold text-rose-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#5846F6] hover:bg-[#4735E5] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
