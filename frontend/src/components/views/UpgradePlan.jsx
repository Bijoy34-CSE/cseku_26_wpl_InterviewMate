import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, CheckCircle2, ChevronDown, CreditCard, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { getPlanStatus, submitPaymentReference } from '../../api';

const METHOD_LABELS = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket' };
const PAYMENT_METHODS = [
  { id: 'bkash', label: METHOD_LABELS.bkash, logo: '/payment-logos/Bkash-Logo.png' },
  { id: 'nagad', label: METHOD_LABELS.nagad, logo: '/payment-logos/Nagad-Logo.png' },
  { id: 'rocket', label: METHOD_LABELS.rocket, logo: '/payment-logos/DBBL-Mobile-Banking-Becomes-Rocket.jpg' },
];

export default function UpgradePlan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [planData, setPlanData] = useState(null);
  const [method, setMethod] = useState('');
  const [paymentStep, setPaymentStep] = useState(1);
  const [showPaymentProcess, setShowPaymentProcess] = useState(searchParams.get('reason') === 'free-limit');
  const [planChoice, setPlanChoice] = useState(searchParams.get('plan') === 'yearly' ? 'yearly' : 'monthly');
  const [reference, setReference] = useState('');
  const [payerNumber, setPayerNumber] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPlan = useCallback(async () => {
    const { data } = await getPlanStatus();
    setPlanData(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlan().catch((requestError) => {
      setError(requestError.response?.data?.message || 'Could not load plan details.');
      setLoading(false);
    });
  }, [loadPlan]);

  const submitReference = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const { data } = await submitPaymentReference({
        provider: method,
        payerNumber,
        providerReference: reference,
        plan: planChoice,
      });
      setNotice(data.message);
      setPlanData((current) => current ? {
        ...current,
        pendingPayment: data.payment,
        latestPayment: data.payment,
      } : current);
      setPayerNumber('');
      setReference('');
      setPaymentStep(1);
      setMethod('');
      try {
        await loadPlan();
      } catch (refreshError) {
        const refreshMessage = refreshError.response?.data?.message;
        setError(refreshMessage
          ? `Your payment was submitted, but its status could not be refreshed: ${refreshMessage}`
          : 'Your payment was submitted, but we could not refresh its status. Refresh this page to check it.');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit payment reference.');
    } finally {
      setSubmitting(false);
    }
  };

  const choosePlan = (choice) => {
    setPlanChoice(choice);
    setPaymentStep(1);
    setPayerNumber('');
    setReference('');
    setError('');
  };

  const continueToTransactionId = (event) => {
    event.preventDefault();
    setError('');
    setPaymentStep(2);
  };

  const plan = planData?.plan;
  const merchantAccounts = planData?.paymentInstructions?.merchantAccounts || {};
  const price = planChoice === 'yearly' ? plan?.yearlyPriceBdt ?? 2999 : plan?.monthlyPriceBdt ?? 499;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F7F8FF] via-[#F0EEFF] to-[#F5FAFF] font-sans text-slate-800 antialiased">
      <Sidebar />
      <main className="min-w-0 flex-1 space-y-7 overflow-y-auto p-4 sm:p-7 lg:p-10">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Back</button>
        <header className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 px-3 py-1.5 text-xs font-extrabold text-[#5846F6]"><Sparkles className="h-4 w-4" /> INTERVIEWMATE PREMIUM</span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Keep building your confidence.</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">Get unlimited AI interview sessions, personalized evaluation, and the full InterviewMate workspace.</p>
        </header>

        {loading ? <div className="mx-auto max-w-xl rounded-3xl border border-white bg-white/70 p-10 text-center text-sm font-semibold text-slate-500"><LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />Loading your plan…</div> : (
          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-white bg-white/80 p-6 shadow-xl shadow-indigo-200/30 backdrop-blur sm:p-8">
              <div className="flex items-center justify-between">
                <div><p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Your current plan</p><h2 className="mt-1 text-2xl font-black capitalize text-slate-900">{plan?.plan || 'Free'}</h2></div>
                {plan?.plan === 'premium' ? <BadgeCheck className="h-9 w-9 text-emerald-500" /> : <ShieldCheck className="h-9 w-9 text-[#5846F6]" />}
              </div>
              {plan?.plan === 'premium' ? (
                <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                  {plan.isUnlimited
                    ? 'Administrators have unlimited Premium access.'
                    : `Premium is active until ${new Date(plan.subscriptionExpiresAt).toLocaleDateString()}.`}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-indigo-50 p-4">
                  <p className="text-sm font-bold text-slate-800">Free sessions this month</p>
                  <div className="mt-3 flex gap-2" aria-label={`${plan?.freeSessionsUsed ?? 0} of 3 free sessions used`}>
                    {[0, 1, 2].map((slot) => <span key={slot} className={`h-2 flex-1 rounded-full ${slot < (plan?.freeSessionsUsed ?? 0) ? 'bg-[#5846F6]' : 'bg-indigo-100'}`} />)}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{plan?.freeSessionsRemaining ?? 3} of 3 sessions remaining · resets {plan?.month}</p>
                </div>
              )}
              <ul className="mt-7 space-y-4 text-sm font-semibold text-slate-700">
                {['Unlimited interview sessions', 'Personalized AI feedback and scoring', 'Full interview history and performance insights', 'All curated practice questions'].map((feature) => <li key={feature} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-50 text-[#5846F6]"><BadgeCheck className="h-4 w-4" /></span>{feature}</li>)}
              </ul>
            </section>

            <section className="rounded-3xl bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] p-6 text-white shadow-2xl shadow-blue-300/40 sm:p-8">
              {plan?.isUnlimited ? (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-100">
                    <BadgeCheck className="h-5 w-5 text-emerald-300" /> ADMINISTRATOR BENEFIT
                  </div>
                  <p className="mt-4 text-lg font-black">Premium access is unlimited</p>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-100">
                    Your administrator account has unlimited interview sessions and Premium features. No payment or renewal is required.
                  </p>
                </div>
              ) : (
                <>
              <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-100"><CreditCard className="h-4 w-4" /> PREMIUM PLANS</div>
              {searchParams.get('reason') === 'free-limit' && (
                <p role="status" className="mt-4 rounded-xl border border-amber-200/30 bg-amber-300/10 p-3 text-sm font-semibold text-amber-50">
                  You have used all 3 free interviews this month. Choose a Premium plan to continue.
                </p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => choosePlan('monthly')} aria-pressed={planChoice === 'monthly'} className={`rounded-xl border p-3 text-left transition ${planChoice === 'monthly' ? 'border-white bg-white text-indigo-900' : 'border-white/25 bg-white/10 text-white'}`}><span className="block text-[10px] font-extrabold uppercase">Monthly</span><span className="mt-1 block text-lg font-black">৳{plan?.monthlyPriceBdt ?? 499}</span><span className="text-[10px] font-semibold">30 days</span></button>
                <button type="button" onClick={() => choosePlan('yearly')} aria-pressed={planChoice === 'yearly'} className={`rounded-xl border p-3 text-left transition ${planChoice === 'yearly' ? 'border-white bg-white text-indigo-900' : 'border-white/25 bg-white/10 text-white'}`}><span className="block text-[10px] font-extrabold uppercase">Yearly · Best value</span><span className="mt-1 block text-lg font-black">৳{plan?.yearlyPriceBdt ?? 2999}</span><span className="text-[10px] font-semibold">365 days</span></button>
              </div>
              <div className="mt-4 flex items-end gap-2"><span className="text-5xl font-black">৳{price}</span><span className="mb-1 text-sm font-semibold text-indigo-100">/ {planChoice === 'yearly' ? 'year' : '30 days'}</span></div>
              {planData?.pendingPayment ? (
                <div className="mt-7 rounded-2xl border border-white/20 bg-white/10 p-4">
                  <p className="font-extrabold">Payment submitted</p>
                  <p className="mt-1 text-sm leading-relaxed text-indigo-100">Your {METHOD_LABELS[planData.pendingPayment.provider]} payment for the {planData.pendingPayment.plan || 'monthly'} plan (৳{planData.pendingPayment.amount}) from {planData.pendingPayment.payerNumber || 'your payment number'} is awaiting admin verification. Premium activates after approval.</p>
                </div>
              ) : plan?.plan === 'premium' ? (
                <p className="mt-7 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm leading-relaxed text-indigo-100">Your premium plan is active. You can renew when it is close to expiration.</p>
              ) : (
                <>
                {planData?.latestPayment?.status === 'rejected' && <p className="mt-5 rounded-xl border border-rose-200/30 bg-rose-300/10 p-3 text-sm text-rose-50">Your last payment reference was not approved. {planData.latestPayment.adminNote || 'Check the reference and try again.'}</p>}
                <button
                  type="button"
                  aria-expanded={showPaymentProcess}
                  onClick={() => setShowPaymentProcess((open) => !open)}
                  className="mt-7 flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left text-sm font-black text-indigo-900 shadow-lg transition hover:bg-indigo-50"
                >
                  <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment Process</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showPaymentProcess ? 'rotate-180' : ''}`} />
                </button>
                {showPaymentProcess && (
                  <div className="mt-4 space-y-4 rounded-2xl border border-white/20 bg-white/10 p-4">
                    <p className="text-xs leading-relaxed text-indigo-100">
                      Select the wallet you paid with, then enter the payment number you sent money from and the transaction ID on your receipt. The admin will verify your request before Premium is activated.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map(({ id, label, logo }) => (
                        <button
                          key={id}
                          type="button"
                          aria-label={`Pay with ${label}`}
                          aria-pressed={method === id}
                          onClick={() => {
                            setMethod(id);
                            setPaymentStep(1);
                            setPayerNumber('');
                            setReference('');
                            setError('');
                          }}
                          className={`flex min-h-16 items-center justify-center rounded-xl border bg-white px-2 py-2 transition hover:-translate-y-0.5 hover:bg-white/95 ${method === id ? 'border-cyan-200 ring-2 ring-cyan-200' : 'border-white/30'}`}
                        >
                          <img src={logo} alt={label} className="h-9 w-full object-contain" />
                        </button>
                      ))}
                    </div>
                    {method && (
                      <>
                        <ol className="space-y-2 text-xs leading-relaxed text-indigo-50">
                          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Send ৳{price} to the {METHOD_LABELS[method]} number shown below.</li>
                          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Enter the number you paid from, then enter the transaction ID from your receipt.</li>
                        </ol>
                        <div className="rounded-xl bg-white/10 p-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-100">InterviewMate {METHOD_LABELS[method]} payment number</p>
                            <p className="mt-1 text-xl font-black tracking-wide">{merchantAccounts[method] || '01786033697'}</p>
                            <p className="mt-1 text-[10px] font-semibold text-indigo-100">Use this number as the payment recipient.</p>
                        </div>
                        <form onSubmit={paymentStep === 1 ? continueToTransactionId : submitReference} className="space-y-3">
                          {paymentStep === 1 ? (
                            <>
                              <label htmlFor="payer-number" className="block text-xs font-extrabold">Your payment number (number you paid from)</label>
                              <input id="payer-number" type="tel" required minLength={8} maxLength={16} pattern="\+?[0-9]{8,15}" value={payerNumber} onChange={(event) => setPayerNumber(event.target.value)} className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-indigo-200 focus:border-white" placeholder="e.g. 017XXXXXXXX" />
                              <button type="submit" className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-800 shadow-lg transition hover:bg-indigo-50">Continue to transaction ID</button>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-semibold text-indigo-100">Paid from: <span className="font-black text-white">{payerNumber}</span></p>
                              <label htmlFor="payment-reference" className="block text-xs font-extrabold">Transaction ID from receipt</label>
                              <input id="payment-reference" required minLength={6} maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} className="w-full rounded-xl border border-white/25 bg-white/10 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-indigo-200 focus:border-white" placeholder="Enter the receipt transaction ID" />
                              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-indigo-800 shadow-lg transition hover:bg-indigo-50 disabled:opacity-60">{submitting ? 'Submitting…' : `Submit ${METHOD_LABELS[method]} payment`}</button>
                            </>
                          )}
                        </form>
                      </>
                    )}
                  </div>
                )}
                </>
              )}
              {error && <p role="alert" className="mt-4 rounded-xl bg-rose-400/20 p-3 text-sm font-semibold text-white">{error}</p>}
              {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-300/20 p-3 text-sm font-semibold text-white">{notice}</p>}
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
