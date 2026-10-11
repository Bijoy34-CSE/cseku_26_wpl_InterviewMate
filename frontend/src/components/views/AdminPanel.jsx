import React, { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from '../Sidebar';
import { useUser } from '../../context/UserContext';
import {
  BadgeDollarSign, BookOpenCheck, CircleAlert, LayoutDashboard,
  LoaderCircle, MessageSquareText, Plus, Search, Users, Video,
} from 'lucide-react';
import {
  addAdminQuestion,
  getAdminFeedback,
  getAdminOverview,
  getAdminPayments,
  getAdminQuestions,
  getAdminSessions,
  getAdminUsers,
  reviewAdminPayment,
  updateAdminQuestion,
  updateAdminUserAccess,
  getCurrentUser,
} from '../../api';

const TABS = [
  ['overview', 'Overview', LayoutDashboard],
  ['users', 'Users', Users],
  ['sessions', 'Interviews', Video],
  ['questions', 'Questions', BookOpenCheck],
  ['feedback', 'Feedback', MessageSquareText],
  ['payments', 'Payments', BadgeDollarSign],
];

const dateLabel = (date) => date ? new Date(date).toLocaleString() : '—';

export default function AdminPanel() {
  const { user, setUser } = useUser();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [question, setQuestion] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [editingId, setEditingId] = useState('');
  const [editQuestion, setEditQuestion] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('Medium');
  const [notice, setNotice] = useState('');
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const request = {
        overview: getAdminOverview,
        users: () => getAdminUsers({ search, page: userPage }),
        sessions: getAdminSessions,
        questions: getAdminQuestions,
        feedback: getAdminFeedback,
        payments: getAdminPayments,
      }[tab];
      const response = await request();
      if (requestId !== requestSequence.current) return;
      setData(response.data);
      if (user?.role !== 'admin') {
        const { data: accountData } = await getCurrentUser();
        if (requestId !== requestSequence.current) return;
        setUser((currentUser) => currentUser
          ? { ...currentUser, role: accountData.user.role }
          : currentUser);
      }
    } catch (requestError) {
      if (requestId !== requestSequence.current) return;
      const isMissingAdminAccess =
        requestError.response?.status === 403 &&
        requestError.response?.data?.code === 'ADMIN_REQUIRED';
      setError(isMissingAdminAccess
        ? `The account signed in here${user?.email ? ` (${user.email})` : ''} is not configured as an administrator. Set ADMIN_EMAILS in backend/.env to this account's exact email, restart the backend, then sign out and sign in again.`
        : requestError.response?.data?.message || 'Could not load administration data.');
      setData(null);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [tab, search, userPage, setUser, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const createQuestion = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await addAdminQuestion({ question, topic, difficulty });
      setQuestion('');
      setTopic('');
      setNotice('Practice question added.');
      await refresh();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not add question.');
    }
  };

  const reviewPayment = async (payment, status) => {
    setError('');
    setNotice('');
    try {
      await reviewAdminPayment(payment._id, { status });
      const days = payment.plan === 'yearly' ? 365 : 30;
      setNotice(status === 'approved' ? `Payment approved and ${days}-day Premium activated.` : 'Payment rejected.');
      await refresh();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not review payment.');
    }
  };

  const setQuestionActive = async (entry) => {
    setError('');
    try {
      await updateAdminQuestion(entry._id, { active: !entry.active });
      await refresh();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update question.');
    }
  };

  const beginQuestionEdit = (entry) => {
    setEditingId(entry._id);
    setEditQuestion(entry.question);
    setEditTopic(entry.topic);
    setEditDifficulty(entry.difficulty);
  };

  const saveQuestionEdit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await updateAdminQuestion(editingId, {
        question: editQuestion,
        topic: editTopic,
        difficulty: editDifficulty,
      });
      setEditingId('');
      setNotice('Practice question updated.');
      await refresh();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save question changes.');
    }
  };

  const setUserActive = async (entry) => {
    setError('');
    try {
      await updateAdminUserAccess(entry._id, { isActive: !entry.isActive });
      setNotice(entry.isActive ? 'Account disabled.' : 'Account re-enabled.');
      await refresh();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update account access.');
    }
  };

  const selectTab = (nextTab) => {
    if (nextTab === tab) {
      refresh();
      return;
    }
    requestSequence.current += 1;
    setData(null);
    setError('');
    setNotice('');
    setLoading(true);
    setTab(nextTab);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F7F8FF] via-[#F0EEFF] to-[#F5FAFF] font-sans text-slate-800 antialiased">
      <Sidebar />
      <main className="min-w-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-7 lg:p-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#5846F6]">CONTROL CENTER</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Admin workspace</h1>
            <p className="mt-1 text-sm text-slate-500">Manage platform activity, user feedback, practice content, and premium payments.</p>
          </div>
          <button onClick={refresh} disabled={loading} className="rounded-xl border border-white bg-white/80 px-4 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-white disabled:opacity-60">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white/60 p-2 shadow-sm" aria-label="Admin sections">
          {TABS.map(([id, label, Icon]) => <button key={id} onClick={() => selectTab(id)} aria-current={tab === id ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:px-4 ${tab === id ? 'bg-gradient-to-r from-[#5846F6] to-[#796BFF] text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</button>)}
        </nav>

        {error && <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}
        {loading && !data ? <div className="rounded-3xl border border-white bg-white/70 p-12 text-center text-sm font-semibold text-slate-500"><LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />Loading admin data…</div> : null}

        {data && tab === 'overview' && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['Users', data.stats.users, Users],
                ['Interview sessions', data.stats.sessions, Video],
                ['Feedback entries', data.stats.feedback, MessageSquareText],
                ['Payment records', data.stats.payments, BadgeDollarSign],
                ['Awaiting review', data.stats.pendingPayments, CircleAlert],
                ['Verified revenue', `৳${data.stats.verifiedRevenueBdt}`, BadgeDollarSign],
              ].map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-white bg-white/80 p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><Icon className="h-4 w-4 text-[#5846F6]" /></div><p className="mt-4 text-3xl font-black text-slate-900">{value}</p></article>)}
            </section>
            <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-black text-slate-900">Recently registered users</h2>
              <div className="mt-4 divide-y divide-slate-100">{data.latestUsers.map((entry) => <div key={entry._id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-bold text-slate-800">{entry.name}</p><p className="text-xs text-slate-500">{entry.email}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-extrabold uppercase text-indigo-700">{entry.role || 'user'}</span></div>)}</div>
            </section>
          </>
        )}

        {data && tab === 'users' && (
          <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-black">User accounts</h2><label className="relative max-w-xs flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setUserPage(1); }} placeholder="Search name or email" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400" /></label></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="py-3">User</th><th>Role</th><th>Created</th><th>Plan ends</th><th>Free sessions</th><th>Access</th></tr></thead><tbody className="divide-y divide-slate-100">{(data.users || []).map((entry) => <tr key={entry._id}><td className="py-3"><p className="font-bold text-slate-800">{entry.name}</p><p className="text-slate-500">{entry.email}</p></td><td>{entry.role || 'user'}</td><td>{dateLabel(entry.createdAt)}</td><td>{dateLabel(entry.subscriptionExpiresAt)}</td><td>{entry.freeUsageMonth ? `${entry.freeSessionsUsed || 0}/3 · ${entry.freeUsageMonth}` : '0/3'}</td><td><button onClick={() => setUserActive(entry)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold ${entry.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700' : 'bg-rose-50 text-rose-700 hover:bg-emerald-50 hover:text-emerald-700'}`}>{entry.isActive ? 'Disable' : 'Re-enable'}</button></td></tr>)}</tbody></table></div>
          </section>
        )}

        {data && tab === 'sessions' && (
          <section className="overflow-x-auto rounded-3xl border border-white bg-white/80 p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-sm font-black">Interview sessions (recent 100)</h2>{(data.sessions || []).length ? <table className="w-full min-w-[740px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="py-3">Candidate</th><th>Purpose</th><th>Status</th><th>Questions</th><th>Started</th></tr></thead><tbody className="divide-y divide-slate-100">{data.sessions.map((entry) => <tr key={entry._id}><td className="py-3"><p className="font-bold">{entry.user?.name || 'Deleted user'}</p><p className="text-slate-500">{entry.user?.email || ''}</p></td><td>{entry.purpose}</td><td>{entry.status}</td><td>{entry.currentQuestionIndex}/{entry.totalQuestions}</td><td>{dateLabel(entry.startedAt)}</td></tr>)}</tbody></table> : <p className="py-8 text-center text-sm text-slate-500">No interview sessions yet.</p>}</section>
        )}

        {data && tab === 'questions' && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-sm font-black">Practice questions curated by admins</h2><div className="space-y-3">{(data.practiceQuestions || []).map((entry) => <article key={entry._id} className="rounded-2xl border border-slate-100 bg-white p-4">
              {editingId === entry._id ? (
                <form onSubmit={saveQuestionEdit} className="space-y-3">
                  <textarea required minLength={8} maxLength={2000} value={editQuestion} onChange={(event) => setEditQuestion(event.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" />
                  <div className="grid grid-cols-2 gap-2">
                    <input required maxLength={100} value={editTopic} onChange={(event) => setEditTopic(event.target.value)} className="rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-indigo-400" aria-label="Edit question topic" />
                    <select value={editDifficulty} onChange={(event) => setEditDifficulty(event.target.value)} className="rounded-xl border border-slate-200 p-2 text-xs"><option>Easy</option><option>Medium</option><option>Hard</option></select>
                  </div>
                  <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingId('')} className="rounded-lg border px-3 py-2 text-xs font-bold">Cancel</button><button className="rounded-lg bg-[#5846F6] px-3 py-2 text-xs font-bold text-white">Save</button></div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold leading-relaxed text-slate-800">{entry.question}</p><p className="mt-2 text-xs font-semibold text-slate-500">{entry.topic} · {entry.difficulty} · {entry.active ? 'Visible' : 'Hidden'}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => beginQuestionEdit(entry)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50">Edit</button><button onClick={() => setQuestionActive(entry)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50">{entry.active ? 'Hide' : 'Publish'}</button></div></div>
              )}
            </article>)}</div>{!data.practiceQuestions?.length && <p className="py-6 text-center text-sm text-slate-500">No curated practice questions yet.</p>}</section>
            <form onSubmit={createQuestion} className="h-fit space-y-4 rounded-3xl border border-white bg-white/80 p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Plus className="h-4 w-4 text-[#5846F6]" /><h2 className="text-sm font-black">Add practice question</h2></div><label className="block text-xs font-bold">Question<textarea required minLength={8} maxLength={2000} rows={5} value={question} onChange={(event) => setQuestion(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium outline-none focus:border-indigo-400" /></label><label className="block text-xs font-bold">Topic<input required maxLength={100} value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-400" /></label><label className="block text-xs font-bold">Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-400"><option>Easy</option><option>Medium</option><option>Hard</option></select></label><button className="w-full rounded-xl bg-gradient-to-r from-[#5846F6] to-[#796BFF] px-4 py-3 text-sm font-extrabold text-white shadow-md">Publish question</button><p className="text-[11px] leading-relaxed text-slate-500">Questions from interview sessions are listed separately; candidate documents and answer content are not exposed here.</p></form>
            <section className="xl:col-span-2 rounded-3xl border border-white bg-white/80 p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-sm font-black">Questions generated in interviews</h2><div className="grid gap-3 md:grid-cols-2">{(data.sessionQuestions || []).map((entry) => <article key={entry._id} className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-sm font-bold text-slate-800">{entry.text}</p><p className="mt-2 text-xs text-slate-500">{entry.session?.user?.name || 'User'} · {entry.session?.purpose || 'Session'} · {entry.difficulty}</p></article>)}</div>{!data.sessionQuestions?.length && <p className="py-6 text-center text-sm text-slate-500">No interview questions yet.</p>}</section>
          </div>
        )}

        {data && tab === 'feedback' && (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-sm font-black">Product feedback</h2><div className="space-y-3">{(data.siteFeedback || []).map((entry) => <article key={entry._id} className="rounded-2xl border border-slate-100 bg-white p-4"><div className="flex justify-between gap-3"><span className="text-xs font-extrabold text-indigo-700">{entry.category}</span><time className="text-[10px] text-slate-400">{dateLabel(entry.createdAt)}</time></div><p className="mt-2 text-sm leading-relaxed text-slate-700">{entry.message}</p><p className="mt-2 text-xs font-semibold text-slate-400">{entry.user?.name || 'Deleted user'} · {entry.user?.email || ''}</p></article>)}</div>{!data.siteFeedback?.length && <p className="py-6 text-center text-sm text-slate-500">No product feedback yet.</p>}</section>
            <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-sm font-black">Interview assessments</h2><div className="space-y-3">{(data.interviewFeedback || []).map((entry) => <article key={entry._id} className="rounded-2xl border border-slate-100 bg-white p-4"><div className="flex justify-between gap-3"><span className="text-xs font-extrabold text-slate-700">{entry.session?.purpose || 'Interview'}</span><span className="text-sm font-black text-[#5846F6]">{entry.overallScore}/100</span></div><p className="mt-2 text-sm leading-relaxed text-slate-600">{entry.assessment}</p></article>)}</div>{!data.interviewFeedback?.length && <p className="py-6 text-center text-sm text-slate-500">No interview assessments yet.</p>}</section>
          </div>
        )}

        {data && tab === 'payments' && (
          <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black">Premium payment verification</h2>
              <div className="flex gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">৳{data.monthlyPremiumPriceBdt}/30 days</span>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-extrabold text-violet-700">৳{data.yearlyPremiumPriceBdt}/year</span>
              </div>
            </div>
            <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              Verify the payment number and transaction ID with the selected wallet before approving. Approval activates the selected plan for 30 or 365 days.
            </p>
            <div className="space-y-3">
              {(data.payments || []).map((entry) => (
                <article key={entry._id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">{entry.user?.name || 'Deleted user'} <span className="font-medium text-slate-500">· {entry.user?.email || ''}</span></p>
                    <p className="mt-1 text-xs text-slate-500">Payment Number: {entry.payerNumber || 'Not provided'} · Payment with: {entry.provider.toUpperCase()}</p>
                    <p className="mt-1 text-xs text-slate-500">{entry.plan === 'yearly' ? 'Yearly' : 'Monthly'} · ৳{entry.amount} · Transaction ID: {entry.providerReference}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{dateLabel(entry.createdAt)} · {entry.status}{entry.adminNote ? ` · ${entry.adminNote}` : ''}</p>
                  </div>
                  {entry.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => reviewPayment(entry, 'rejected')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-extrabold text-rose-600 hover:bg-rose-50">Reject</button>
                      <button onClick={() => reviewPayment(entry, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700">Verify &amp; activate</button>
                    </div>
                  )}
                </article>
              ))}
              {!data.payments?.length && <p className="rounded-xl bg-slate-50 py-8 text-center text-sm font-semibold text-slate-500">No payment requests to review yet. Refresh this section after a user submits a payment.</p>}
            </div>
          </section>
        )}

        {data && tab === 'users' && <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-500"><button disabled={data.page <= 1} onClick={() => setUserPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-white bg-white/80 px-3 py-2 disabled:opacity-40">Previous</button><span>Page {data.page} of {Math.max(1, data.pages)} · {data.total} users</span><button disabled={data.page >= data.pages} onClick={() => setUserPage((value) => value + 1)} className="rounded-lg border border-white bg-white/80 px-3 py-2 disabled:opacity-40">Next</button></div>}
      </main>
    </div>
  );
}
