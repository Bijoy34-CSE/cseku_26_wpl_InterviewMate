import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { useReveal } from '../../hooks/useReveal';
import Logo from '../Logo';
import {
  Sparkles, ArrowRight, CheckCircle2, Briefcase, GraduationCap, UserCheck, Award, ShieldCheck,
  Brain, Mic, Zap, Check, HelpCircle, Download, Layers, FileCheck, Target, BarChart3,
  Globe2, Users2, Menu, X, ArrowUpRight, Upload, LockKeyhole,
} from 'lucide-react';

const NAV_LINKS = [
  ['#features', 'Features'],
  ['#workflow', 'How it works'],
  ['#pricing', 'Pricing'],
];

const DOMAINS = [
  'Computer Science', 'System Design', 'Software Engineering', 'Thesis Defense',
  'Data Structures', 'Technical Interviews',
];

const STEPS = [
  { n: '01', icon: Upload, title: 'Upload Syllabus or Resume', desc: 'Drop your course outline, lab topics, thesis abstract, or job description. Our AI builds a custom evaluation model instantly.', chips: ['Syllabus', 'Resume', 'Thesis abstract', 'Job description'] },
  { n: '02', icon: Mic, title: 'Engage in Voice AI Viva', desc: 'Answer real-time questions using natural speech. The AI listens, adapts to your depth, and asks follow-up probing questions.', chips: ['Natural speech', 'Adaptive depth', 'Follow-ups'] },
  { n: '03', icon: BarChart3, title: 'Get Granular Insights', desc: 'Receive a comprehensive feedback score detailing technical gaps, structural accuracy, clarity, and Big-O nuances.', chips: ['Technical gaps', 'Structure', 'Clarity', 'Big-O'] },
];

const FEATURES = [
  { icon: Brain, title: 'Probing AI Follow-ups', desc: 'Just like real professors, our AI asks progressive follow-ups if your first response lacks depth.' },
  { icon: FileCheck, title: 'Syllabus Context Mapping', desc: 'Upload PDF syllabi or lecture slides to automatically extract target technical domains.' },
  { icon: BarChart3, title: 'Weakness Heatmaps', desc: 'Identify exact concepts where you stumble\u2014from Big-O analysis to system concurrency.' },
  { icon: Target, title: 'Custom Scoring Rubrics', desc: 'Set strict university grading rubrics or standard corporate interview benchmarks.' },
  { icon: Globe2, title: 'Multi-Domain Support', desc: 'Tailored mode for Computer Science, Electrical Engineering, Business, and Medical vivas.' },
  { icon: Users2, title: 'Peer Benchmark Metrics', desc: 'Compare your performance percentile with thousands of candidates in your domain.' },
];

const AUDIENCE = [
  { icon: Briefcase, title: 'Job Seekers', desc: 'Software, Tech, Product & Corporate Roles' },
  { icon: GraduationCap, title: 'University Students', desc: 'Viva Voce, Lab Defense & Thesis Defense' },
  { icon: UserCheck, title: 'Internship Applicants', desc: 'First Round & Screening Oral Exams' },
  { icon: Award, title: 'Researchers', desc: 'Grant Defense & Dissertation Screenings' },
  { icon: ShieldCheck, title: 'Certified Pros', desc: 'Executive, Healthcare & Finance Credentials' },
];

const PLANS = [
  { name: 'Free', price: '৳0', per: '/ month', blurb: 'Start with the core InterviewMate experience.', items: ['3 AI mock sessions / month', 'Curated interview prompts', 'Interview history and scorecards'], cta: 'Get Started Free', style: 'light' },
  { name: 'Premium Monthly', price: '৳499', per: '/ 30 days', blurb: 'Flexible access for focused interview preparation.', items: ['Unlimited AI mock interview sessions', 'PDF, DOCX & PPTX document uploads', 'Adaptive follow-up questions', 'Detailed scoring and performance insights'], cta: 'Choose Monthly', style: 'blue', badge: 'Flexible' },
  { name: 'Premium Yearly', price: '৳2,999', per: '/ year', blurb: 'Full-year access at the best annual value.', items: ['Everything in Premium Monthly', '365 days of uninterrupted Premium access', 'Save ৳2,989 vs twelve monthly renewals'], cta: 'Choose Yearly', style: 'navy', badge: 'Best value' },
];

const ICON_TONES = [
  { tile: 'from-blue-500 to-cyan-500', icon: 'text-white' },
  { tile: 'from-violet-500 to-indigo-500', icon: 'text-white' },
  { tile: 'from-amber-400 to-orange-500', icon: 'text-white' },
  { tile: 'from-emerald-400 to-teal-500', icon: 'text-white' },
  { tile: 'from-sky-400 to-blue-600', icon: 'text-white' },
  { tile: 'from-fuchsia-500 to-violet-600', icon: 'text-white' },
];

/* ---------- small building blocks ---------- */

function Brand() {
  return (
    <Logo size={38} subtitle tone="light" className="transition hover:scale-[1.02]" />
  );
}

function Eyebrow({ children, dark }) {
  return <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? 'text-cyan-200' : 'text-[var(--lp-blue-600)]'}`}>{children}</span>;
}

function MarqueeRow({ items, reverse }) {
  const row = (hidden) => (
    <ul className="flex shrink-0 items-center gap-12 pr-12" aria-hidden={hidden || undefined}>
      {items.map((it, i) => (
        <li key={`${it}-${i}`} className="flex items-center gap-3 whitespace-nowrap text-xl font-semibold tracking-tight text-blue-300 sm:text-2xl">
          <Layers className="h-5 w-5 opacity-60" /> {it}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="lp-marquee overflow-hidden">
      <div className={`lp-marquee-track flex w-max ${reverse ? 'lp-marquee-rev' : ''}`}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

// Scroll-driven showcase: a tall section with a sticky viewport; scroll
// progress picks the active step, which cross-fades and scales.
function ScrollShowcase() {
  const wrap = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrap.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        setActive(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section id="workflow" ref={wrap} className="relative bg-gradient-to-br from-[#EAF4FF] via-[#F5F8FF] to-[#E9F3FF] text-slate-900" style={{ height: `${STEPS.length * 85 + 40}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-5 py-20">
        <div className="mx-auto mb-8 flex w-full max-w-6xl items-end justify-between gap-6">
          <div>
            <Eyebrow>3-Step Workflow</Eyebrow>
            <h2 className="mt-3 text-3xl font-light tracking-tight sm:text-5xl">How InterviewMate Prepares You</h2>
            <p className="mt-3 max-w-md text-sm text-slate-600">Master your subject in three simple steps before stepping into the viva room.</p>
          </div>
          <span className="hidden text-5xl font-extralight tabular-nums text-blue-700/80 sm:block">
            {STEPS[active].n}<span className="text-sky-500/65"> / 0{STEPS.length}</span>
          </span>
        </div>

        <div className="relative mx-auto h-[56vh] min-h-[340px] w-full max-w-6xl">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const on = i === active;
            return (
              <article
                key={s.n}
                aria-hidden={!on}
                className={`absolute inset-0 grid overflow-hidden rounded-[2rem] border border-blue-100/25 bg-gradient-to-br from-[#287FE8] via-[#176BD2] to-[#1D4F9C] p-6 text-white shadow-2xl shadow-blue-950/25 transition-all duration-[600ms] ease-out sm:p-10 md:grid-cols-2 ${on ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.94] opacity-0'}`}
              >
                <div className="flex flex-col justify-between gap-6">
                  <span className="text-6xl font-extralight text-white/60 sm:text-8xl">{s.n}</span>
                  <div>
                    <h3 className="text-2xl font-light tracking-tight sm:text-4xl">{s.title}</h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">{s.desc}</p>
                    <Link to="/signup" tabIndex={on ? 0 : -1} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#1D4F9C] transition hover:gap-3 hover:bg-cyan-50">
                      Start preparing <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="relative mt-6 hidden items-center justify-center md:mt-0 md:flex">
                  <div className="lp-aura absolute inset-0 opacity-40" aria-hidden />
                  <div className="relative flex flex-wrap content-center justify-center gap-3">
                    <span className="mb-2 flex basis-full justify-center"><span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur"><Icon className="h-9 w-9" /></span></span>
                    {s.chips.map((c) => (
                      <span key={c} className="rounded-full bg-white/12 px-4 py-2 text-xs font-semibold backdrop-blur">{c}</span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-6xl gap-2" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s.n} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= active ? 'bg-[#176BD2]' : 'bg-blue-200'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- page ---------- */

export default function LandingPage() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Real install prompt where supported; instructions otherwise.
  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'unavailable') setShowInstallHelp(true);
  };

  // Contact form (no backend endpoint exists for it - see notice below)
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [contactSent, setContactSent] = useState(false);

  useReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const audience = AUDIENCE.map((a) => a.title);

  const onContactSubmit = (e) => {
    e.preventDefault();
    setContactSent(true);
  };

  return (
    <div className="lp min-h-screen bg-[#EDF4FF] text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Announcement */}
      <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#38BDF8] via-[#287FE8] to-[#245DB7] px-4 py-2 text-center text-xs font-bold text-white">
        <Zap className="h-3.5 w-3.5 fill-cyan-200 text-cyan-200" />
        <span>Voice AI 2.0 with Real-time Thesis Defense Mode is now live!</span>
        <Link to="/signup" className="ml-1 font-extrabold underline underline-offset-2 hover:text-cyan-100">Sign Up Now &rarr;</Link>
      </div>

      {/* Navbar */}
      <header className={`sticky top-0 z-40 transition-all duration-500 ${scrolled ? 'lp-header-glass' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" aria-label="InterviewMate home"><Brand /></Link>

          <nav aria-label="Primary" className="lp-glass-dark hidden items-center gap-1 rounded-full p-1.5 text-[13px] font-medium text-white md:flex">
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-4 py-2 transition-colors hover:bg-white/15">{label}</a>
            ))}
            <Link to="/login" className="flex items-center gap-1 rounded-full px-4 py-2 transition-colors hover:bg-white/15">
              <HelpCircle className="h-3.5 w-3.5" /> Support
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            {!isInstalled && (
              <button type="button" onClick={handleInstall} title={canInstall ? 'Install InterviewMate as an app' : 'How to install this app'} className="hidden items-center gap-1.5 text-xs font-semibold text-white/80 transition hover:text-white lg:flex">
                <Download className="h-3.5 w-3.5" /> Install App
              </button>
            )}
            <Link to="/login" className="hidden text-xs font-semibold text-white/80 transition hover:text-white sm:block">Login</Link>
            <Link to="/signup" className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#1D4F9C] shadow-lg shadow-blue-950/30 transition hover:scale-[1.03] hover:bg-cyan-50 active:scale-95">Sign Up</Link>
            <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={menuOpen} className="rounded-full p-2 text-white md:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lp-glass-dark im-fade-in mx-4 mb-3 rounded-3xl p-3 text-sm font-medium text-white md:hidden">
            {[...NAV_LINKS, ['/login', 'Login']].map(([href, label]) => (
              href.startsWith('/')
                ? <Link key={href} to={href} onClick={() => setMenuOpen(false)} className="block rounded-2xl px-4 py-3 hover:bg-white/10">{label}</Link>
                : <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block rounded-2xl px-4 py-3 hover:bg-white/10">{label}</a>
            ))}
            {!isInstalled && (
              <button type="button" onClick={() => { setMenuOpen(false); handleInstall(); }} className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left hover:bg-white/10"><Download className="h-4 w-4" /> Install App</button>
            )}
          </div>
        )}
      </header>

      {showInstallHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setShowInstallHelp(false)}>
          <div role="dialog" aria-modal="true" className="im-scale-in w-full max-w-sm space-y-3 rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50"><Download className="h-4 w-4 text-blue-600" /></span>
              <h3 className="text-sm font-extrabold text-slate-900">Install InterviewMate</h3>
            </div>
            <p className="text-xs font-medium leading-relaxed text-slate-500">Your browser doesn't expose a one-click install for this app. You can still add it to your device:</p>
            <ul className="list-disc space-y-1.5 pl-4 text-xs font-medium text-slate-600">
              <li><strong>iPhone / iPad (Safari):</strong> tap Share, then "Add to Home Screen".</li>
              <li><strong>Android (Chrome):</strong> tap the menu, then "Add to Home screen".</li>
              <li><strong>Desktop (Chrome/Edge):</strong> click the install icon in the address bar.</li>
              <li><strong>Firefox:</strong> installation isn't supported; bookmark the page instead.</li>
            </ul>
            <button type="button" onClick={() => setShowInstallHelp(false)} className="mt-1 w-full rounded-full bg-slate-100 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-200">Got it</button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="lp-hero relative -mt-[72px] flex min-h-[calc(100svh-2.25rem)] flex-col overflow-hidden pt-[72px]">
        <div className="lp-aura-wrap pointer-events-none absolute inset-0" aria-hidden>
          <div className="lp-aura" />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-4">
          <div className="im-fade-up relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" /> 
            </span>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Turn Interview Anxiety Into Confidence . <span className="lp-heading-accent">Your Next Interview Could Change Everything...</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-blue-100/90 sm:text-base">
              Don't Just Prepare. Prove You're Ready.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-xs font-bold text-[#1D4F9C] shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-blue-950/50 active:scale-95">
                Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#workflow" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3.5 text-xs font-bold text-white ring-1 ring-blue-100/30 backdrop-blur transition hover:bg-white/15">
                Explore how it works <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/65">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> Voice-first interviews</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-blue-200" /> Actionable feedback</span>
            </div>
          </div>

          <div
            className="lp-hero-scene im-fade-up im-delay-2"
            role="img"
            aria-label="AI coaching illustration for InterviewMate"
            onPointerMove={(event) => {
              if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / bounds.width;
              const y = (event.clientY - bounds.top) / bounds.height;
              event.currentTarget.style.setProperty('--lp-shine-x', `${(x * 100).toFixed(1)}%`);
              event.currentTarget.style.setProperty('--lp-shine-y', `${(y * 100).toFixed(1)}%`);
            }}
            onPointerLeave={(event) => {
              event.currentTarget.style.setProperty('--lp-shine-x', '50%');
              event.currentTarget.style.setProperty('--lp-shine-y', '50%');
            }}
          >
            <div className="lp-scene-glow" />
            <div className="lp-artwork">
              <img className="lp-ai-head" src="/interviewmate-ai-hero-cutout.png" alt="" draggable="false" />
              <div className="lp-ai-stage lp-ai-stage-one" aria-hidden="true">
                <img src="/interviewmate-ai-hero-cutout.png" alt="" draggable="false" />
              </div>
              <div className="lp-ai-stage lp-ai-stage-two" aria-hidden="true">
                <img src="/interviewmate-ai-hero-cutout.png" alt="" draggable="false" />
              </div>
              <div className="lp-ai-stage lp-ai-stage-three" aria-hidden="true">
                <img src="/interviewmate-ai-hero-cutout.png" alt="" draggable="false" />
              </div>
              <div className="lp-artwork-gloss" aria-hidden="true" />
            </div>
            <div className="lp-scene-caption"><span /> ADAPTIVE AI COACHING</div>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-5 text-xs text-white/55 sm:px-8">
          <span>Built for the conversations that move you forward.</span>
          <span className="flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-cyan-200" /> Study with confidence</span>
        </div>
      </section>

      {/* Marquee */}
      <section aria-label="Topics and audiences" className="space-y-6 bg-transparent pb-20">
        <MarqueeRow items={DOMAINS} />
        <MarqueeRow items={AUDIENCE.map((item) => item.title)} reverse />
      </section>

      {/* Scroll showcase (How it works) */}
      <ScrollShowcase />

      {/* Features strip */}
      <section id="features" className="bg-transparent px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-4">
          <div className="im-reveal relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#287FE8] via-[#176BD2] to-[#1D4F9C] p-7 text-white shadow-xl shadow-blue-950/20 lg:row-span-2 lg:min-h-[560px]">
            <div className="lp-aura absolute -bottom-24 -left-24 h-80 w-80 opacity-50" aria-hidden />
            <Eyebrow dark>Powerful Features</Eyebrow>
            <div className="relative">
              <h2 className="text-3xl font-light leading-[1.05] tracking-[-0.03em] sm:text-4xl">Engineered for Technical Mastery</h2>
              <p className="mt-3 text-sm text-white/65">Everything you need to boost confidence and outperform standard metrics.</p>
            </div>
          </div>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const tone = ICON_TONES[i % ICON_TONES.length];
            return (
              <div key={f.title} className="lp-glass im-reveal group rounded-3xl p-7 transition-all duration-500 hover:-translate-y-1 hover:border-blue-200 hover:bg-white/90 hover:shadow-2xl hover:shadow-blue-900/10 lg:min-h-[272px]" style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone.tile} shadow-lg shadow-blue-900/15 ring-1 ring-white/70 transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-105`}><Icon className={`h-5 w-5 ${tone.icon}`} strokeWidth={2.2} /></span>
                <h3 className="mt-8 text-2xl font-light leading-tight tracking-[-0.02em]">{f.title}</h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Audience */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="lp-glass mx-auto max-w-7xl rounded-[2.5rem] px-5 py-16 sm:px-12">
          <div className="im-reveal mx-auto mb-12 max-w-2xl space-y-3 text-center">
            <Eyebrow>Target Audience</Eyebrow>
            <h2 className="text-3xl font-light tracking-[-0.03em] text-slate-900 sm:text-5xl">Who Benefits Most From InterviewMate?</h2>
            <p className="text-xs text-slate-500">Our solution is tailored for key benchmark situations across academia and industry.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AUDIENCE.map((item, i) => {
              const Icon = item.icon;
              const tone = ICON_TONES[(i + 2) % ICON_TONES.length];
              return (
                <div key={item.title} className="lp-glass im-reveal rounded-3xl p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/10" style={{ transitionDelay: `${i * 60}ms` }}>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tone.tile} shadow-md shadow-blue-900/15 ring-1 ring-white/70`}><Icon className={`h-5 w-5 ${tone.icon}`} strokeWidth={2.2} /></span>
                  <h3 className="mt-5 text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="im-reveal mx-auto mb-14 max-w-2xl space-y-3 text-center">
            <Eyebrow>Pricing Plans</Eyebrow>
            <h2 className="text-3xl font-light tracking-[-0.03em] text-slate-900 sm:text-5xl">Simple, Transparent Pricing</h2>
            <p className="text-xs text-slate-500">Choose the right plan to boost your viva performance.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {PLANS.map((p, i) => {
              const premium = p.style !== 'light';
              const annual = p.style === 'navy';
              return (
                <div key={p.name} className={`im-reveal relative flex flex-col justify-between gap-8 overflow-hidden rounded-3xl border p-8 backdrop-blur-2xl transition hover:-translate-y-1 ${premium ? annual ? 'border-cyan-100/30 bg-gradient-to-br from-[#28599F]/98 via-[#214B8B]/98 to-[#1B3F78]/98 text-white shadow-2xl shadow-blue-950/20' : 'border-blue-100/60 bg-gradient-to-br from-[#287FE8]/95 via-[#176BD2]/95 to-[#245DB7]/95 text-white shadow-2xl shadow-blue-950/20' : 'lp-glass text-stone-900'}`} style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                  {p.badge && <span className="absolute right-6 top-5 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-900">{p.badge}</span>}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <div className="text-5xl font-light tracking-[-0.04em]">{p.price} <span className={`text-xs font-normal tracking-normal ${premium ? 'text-blue-100' : 'text-stone-500'}`}>{p.per}</span></div>
                    <p className={`text-xs ${premium ? 'text-blue-50/90' : 'text-stone-600'}`}>{p.blurb}</p>
                    <ul className={`space-y-3 border-t pt-4 text-xs ${premium ? 'border-white/20 text-blue-50' : 'border-stone-200 text-stone-700'}`}>
                      {p.items.map((it) => (
                        <li key={it} className="flex items-center gap-2"><Check className={`h-4 w-4 ${premium ? 'text-cyan-300' : 'text-emerald-500'}`} /> {it}</li>
                      ))}
                    </ul>
                  </div>
                  <Link to={premium ? `/login?plan=${annual ? 'yearly' : 'monthly'}` : '/signup'} className={`rounded-full py-3 text-center text-xs font-bold transition hover:scale-[1.02] active:scale-95 ${premium ? 'bg-white text-[#1D4F9C] hover:bg-cyan-50' : 'bg-[#1D4F9C] text-white'}`}>{p.cta}</Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer relative overflow-hidden text-white">
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-10 pt-24 sm:px-8 lg:grid-cols-2">
          <div className="im-reveal">
            <h2 className="text-5xl font-light leading-[1] tracking-[-0.04em] sm:text-7xl">Have<br />questions?</h2>
            <p className="mt-5 max-w-sm text-sm text-white/60">Empowering students and job candidates with AI-driven voice vivas and adaptive oral examinations.</p>
          </div>

          <form onSubmit={onContactSubmit} className="im-reveal space-y-7" aria-label="Contact form">
            {['name', 'email'].map((field) => (
              <label key={field} className="block">
                <span className="sr-only">{field}</span>
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  required
                  placeholder={field === 'name' ? 'Your name' : 'Your email'}
                  value={contact[field]}
                  onChange={(e) => setContact({ ...contact, [field]: e.target.value })}
                  className="w-full border-0 border-b border-white/30 bg-transparent px-0 py-3 text-base text-white placeholder-white/45 transition-colors focus:border-white focus:outline-none focus:ring-0"
                />
              </label>
            ))}
            <label className="block">
              <span className="sr-only">message</span>
              <textarea
                required
                rows={2}
                placeholder="How can we help?"
                value={contact.message}
                onChange={(e) => setContact({ ...contact, message: e.target.value })}
                className="w-full resize-none border-0 border-b border-white/30 bg-transparent px-0 py-3 text-base text-white placeholder-white/45 transition-colors focus:border-white focus:outline-none focus:ring-0"
              />
            </label>
            <button type="submit" className="rounded-full bg-cyan-300 px-8 py-3.5 text-xs font-bold text-[#1D4F9C] transition hover:scale-[1.03] hover:bg-cyan-200 active:scale-95">Send message</button>
            {contactSent && (
              <p role="status" className="im-fade-in text-xs text-white/75">
                Thanks! Direct messages aren't connected yet. Please <Link to="/login" className="font-bold underline">log in</Link> and use Feedback or Help inside the app.
              </p>
            )}
          </form>
        </div>

        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 border-t border-white/15 px-5 py-10 text-xs text-white/65 sm:px-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1"><Brand /></div>
          <div>
            <h4 className="mb-3 font-bold text-white">Product</h4>
            <ul className="space-y-2 text-[11px]">
              {NAV_LINKS.map(([href, label]) => (<li key={href}><a href={href} className="transition-colors hover:text-white">{label === 'How it works' ? 'How It Works' : label}</a></li>))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-bold text-white">Domains</h4>
            <ul className="space-y-2 text-[11px]"><li>Computer Science</li><li>Thesis Defense</li><li>Software Engineering</li><li>System Design</li></ul>
          </div>
          <div>
            <h4 className="mb-3 font-bold text-white">Account</h4>
            <ul className="space-y-2 text-[11px]">
              <li><Link to="/login" className="transition-colors hover:text-white">Login</Link></li>
              <li><Link to="/signup" className="transition-colors hover:text-white">Sign Up</Link></li>
              <li><Link to="/support" className="transition-colors hover:text-white">Support &amp; FAQ</Link></li>
            </ul>
          </div>
        </div>
        <div className="relative border-t border-white/10 py-5 text-center text-[10px] text-white/45">&copy; {new Date().getFullYear()} InterviewMate AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
