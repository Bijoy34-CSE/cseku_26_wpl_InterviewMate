import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Briefcase, 
  GraduationCap, 
  UserCheck, 
  Award, 
  ShieldCheck, 
  Brain, 
  Mic, 
  MicOff, 
  Play, 
  Zap, 
  Check, 
  HelpCircle,
  Download, 
  Cpu,
  RefreshCw,
  Layers,
  Bot,
  FileCheck,
  Target,
  BarChart3,
  Globe2,
  Users2
} from 'lucide-react';

// ১৫টি ভিন্ন ভিন্ন টপিকের প্রশ্ন ও উত্তর ডাটা
const interviewQuestions = [
  {
    topic: "DATABASES",
    question: "What's the main difference between SQL and NoSQL databases? And can you explain why you choose relational over non-relational database for scalable projects?",
    answer: "SQL databases are relational and structured with fixed schemas, whereas NoSQL are non-relational and flexible...",
    score: "92%",
    suggestion: "Add Big-O Nuances"
  },
  {
    topic: "DATA STRUCTURES",
    question: "How does a Hash Table achieve O(1) time complexity for search operations, and how do you handle hash collisions?",
    answer: "Hash Tables use a hash function to map keys to array indices. Collisions are handled via Chaining or Open Addressing...",
    score: "88%",
    suggestion: "Mention Load Factor"
  },
  {
    topic: "SYSTEM DESIGN",
    question: "How would you design a rate limiter for a microservices architecture to handle burst traffic effectively?",
    answer: "I would implement the Token Bucket or Leaky Bucket algorithm using Redis as a centralized memory store...",
    score: "95%",
    suggestion: "Elaborate Distributed Locks"
  },
  {
    topic: "OPERATING SYSTEMS",
    question: "Can you explain the key difference between a Process and a Thread, and what causes a Deadlock?",
    answer: "A process is an isolated execution unit with memory, while threads share memory. Deadlocks occur due to mutual exclusion & circular wait...",
    score: "90%",
    suggestion: "Explain Banker's Algorithm"
  },
  {
    topic: "WEB DEVELOPMENT",
    question: "What is the Virtual DOM in React, and how does the Reconciliation process optimize performance?",
    answer: "Virtual DOM is a lightweight memory representation of the real DOM. React diffs it to batch minimal real DOM updates...",
    score: "94%",
    suggestion: "Mention Fiber Architecture"
  },
  {
    topic: "COMPUTER NETWORKS",
    question: "Explain the TCP 3-Way Handshake process and how HTTPS ensures secure data encryption.",
    answer: "TCP establishes connections using SYN, SYN-ACK, and ACK. HTTPS encrypts traffic via TLS/SSL certificates...",
    score: "87%",
    suggestion: "Cover Asymmetric Keys"
  },
  {
    topic: "MACHINE LEARNING",
    question: "What is the difference between Overfitting and Underfitting, and how do you prevent them?",
    answer: "Overfitting memorizes training data; underfitting fails to capture patterns. Solved using Regularization, Cross-Validation, and Dropout...",
    score: "91%",
    suggestion: "Highlight Bias-Variance"
  },
  {
    topic: "OBJECT-ORIENTED PROGRAMMING",
    question: "What are the 4 core pillars of OOP, and how does Polymorphism differ from Inheritance?",
    answer: "Encapsulation, Abstraction, Inheritance, Polymorphism. Polymorphism allows methods to behave differently based on context...",
    score: "89%",
    suggestion: "Give Runtime Code Example"
  },
  {
    topic: "SOFTWARE ENGINEERING",
    question: "What are the SOLID design principles, and why is Dependency Inversion critical for unit testing?",
    answer: "SOLID ensures scalable code. Dependency Inversion decouples high-level modules from low-level implementations using interfaces...",
    score: "93%",
    suggestion: "Focus on Interface Segregation"
  },
  {
    topic: "CYBERSECURITY",
    question: "How does a Cross-Site Scripting (XSS) attack work, and how can developers mitigate it?",
    answer: "XSS injects malicious client-side scripts into web pages. Prevented by input sanitization, output encoding, and CSP headers...",
    score: "96%",
    suggestion: "Detail HttpOnly Cookies"
  },
  {
    topic: "CLOUD COMPUTING",
    question: "What is the difference between Serverless Architecture and traditional Containers (Docker)?",
    answer: "Serverless scales automatically on-demand per event with zero management, while Docker containers manage persistent environments...",
    score: "86%",
    suggestion: "Explain Cold Start Times"
  },
  {
    topic: "DEVOPS & CI/CD",
    question: "Explain how Blue-Green deployment strategy minimizes downtime during software releases.",
    answer: "Blue-Green runs two identical production environments; traffic is switched instantly from Blue to Green after successful testing...",
    score: "90%",
    suggestion: "Add Rollback Strategy"
  },
  {
    topic: "ALGORITHMS",
    question: "Compare Quick Sort and Merge Sort in terms of time and space complexity.",
    answer: "Quick Sort is O(N log N) average with O(1) auxiliary space, while Merge Sort guarantees O(N log N) time with O(N) space...",
    score: "92%",
    suggestion: "Analyze Worst-Case QuickSort"
  },
  {
    topic: "COMPILER DESIGN",
    question: "What are the main stages of a Compiler pipeline from source code to execution?",
    answer: "Lexical Analysis, Syntax Analysis (Parsing), Semantic Analysis, Intermediate Code Generation, and Optimization...",
    score: "85%",
    suggestion: "Elaborate AST Structure"
  },
  {
    topic: "THESIS / LAB DEFENSE",
    question: "How did you validate your research model's accuracy, and what were the key limitations of your dataset?",
    answer: "Validated using K-Fold Cross-Validation and F1-Score metrics; limitations included domain class imbalance...",
    score: "94%",
    suggestion: "Quantify Confusion Matrix"
  }
];

export default function LandingPage() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  // Use the browser's real install prompt where available; otherwise show
  // platform instructions rather than a button that does nothing.
  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'unavailable') setShowInstallHelp(true);
  };

  const fullText = "Your AI Interviewer for Any Viva or Technical Exam";
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [index, setIndex] = useState(0);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const [demoQuestion, setDemoQuestion] = useState(interviewQuestions[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [demoEvaluated, setDemoEvaluated] = useState(false);

  const [isBold, setIsBold] = useState(false);

  const shuffleDemoQuestion = () => {
    const randomIndex = Math.floor(Math.random() * interviewQuestions.length);
    setDemoQuestion(interviewQuestions[randomIndex]);
    setDemoEvaluated(false);
    setIsRecording(false);
  };

  useEffect(() => {
    shuffleDemoQuestion();
  }, []);

  useEffect(() => {
    const boldInterval = setInterval(() => {
      setIsBold((prev) => !prev);
    }, 1200);
    return () => clearInterval(boldInterval);
  }, []);

  useEffect(() => {
    const handleTyping = () => {
      if (!isDeleting) {
        if (index < fullText.length) {
          setDisplayedText((prev) => prev + fullText.charAt(index));
          setIndex((prev) => prev + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 2200);
        }
      } else {
        if (index > 0) {
          setDisplayedText((prev) => prev.slice(0, -1));
          setIndex((prev) => prev - 1);
        } else {
          setIsDeleting(false);
        }
      }
    };

    const speed = isDeleting ? 35 : 75;
    const timer = setTimeout(handleTyping, speed);
    return () => clearTimeout(timer);
  }, [index, isDeleting, fullText]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentQIndex((prevIndex) => (prevIndex + 1) % interviewQuestions.length);
        setFade(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const activeData = interviewQuestions[currentQIndex];

  // Dashboard-এর হুবহু একই Logo Component & Clockwise Motion
  const DashboardExactLogo = () => (
    <div className="flex items-center gap-2.5 group cursor-pointer">
      <style>{`
        @keyframes dashboardClockwiseRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all duration-300 shrink-0">
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
          
          {/* Dashboard-এর মতো সাইক্লিক ক্লকওয়াইজ গুরার অ্যানিমেশন */}
          <div style={{ animation: 'dashboardClockwiseRotate 8s linear infinite' }} className="flex items-center justify-center z-10">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>

          <Sparkles className="w-3 h-3 text-pink-400 absolute top-1 right-1 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-sm"></div>
        </div>
      </div>

      <div>
        <div className="relative overflow-hidden inline-block py-0.5">
          <h1 className="font-black text-lg leading-none tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            InterviewMate
          </h1>
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-70 pointer-events-none mix-blend-overlay" />
        </div>

        <span 
          className={`text-[8px] italic tracking-wider uppercase block font-mono transition-all duration-700 ${
            isBold ? 'font-black text-slate-900 scale-[1.02]' : 'font-medium text-slate-500 opacity-80'
          }`}
        >
          <span className="text-pink-500 font-bold">AI</span> ADAPTIVE ENGINE
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white relative">
      
      {/* 1. Top Announcement Bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
        <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300 animate-bounce" />
        <span>Voice AI 2.0 with Real-time Thesis Defense Mode is now live!</span>
        <Link to="/signup" className="underline font-bold hover:text-indigo-200 ml-1">Sign Up Now →</Link>
      </div>

      {/* 2. Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <DashboardExactLogo />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-indigo-600 transition-colors">How it works</a>
            <a href="#demo" className="hover:text-indigo-600 transition-colors">Live Demo</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
            <Link to="/login" className="hover:text-indigo-600 transition-colors flex items-center gap-1 font-bold text-indigo-600">
              <HelpCircle className="w-3.5 h-3.5" /> Support
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstall}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                title={canInstall ? 'Install InterviewMate as an app' : 'How to install this app'}
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}
            <Link to="/login" className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors">
              Login
            </Link>
            <Link 
              to="/signup" 
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-indigo-100 transition-all transform active:scale-95"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {showInstallHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setShowInstallHelp(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Download className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">Install InterviewMate</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Your browser doesn't expose a one-click install for this app. You can still add it to your device:
            </p>
            <ul className="text-xs text-slate-600 font-medium space-y-1.5 list-disc pl-4">
              <li><strong>iPhone / iPad (Safari):</strong> tap Share, then "Add to Home Screen".</li>
              <li><strong>Android (Chrome):</strong> tap the menu, then "Add to Home screen".</li>
              <li><strong>Desktop (Chrome/Edge):</strong> click the install icon in the address bar.</li>
              <li><strong>Firefox:</strong> installation isn't supported; bookmark the page instead.</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowInstallHelp(false)}
              className="w-full mt-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded-xl transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* 3. Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-pink-50 border border-indigo-100/60 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-spin" />
            <span>NEXT-GEN AI INTERVIEW COACH</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight text-slate-900 min-h-[120px] sm:min-h-[140px]">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {displayedText}
            </span>
            <span className="inline-block w-1 h-8 sm:h-10 bg-indigo-600 ml-1 animate-pulse align-middle"></span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
            Simulate viva examinations, lab defenses, thesis screenings, and tech job interviews with an adaptive AI voice agent that analyzes your answers in real time.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link 
              to="/signup" 
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white px-7 py-3.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 group"
            >
              Sign Up Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="#demo" 
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-6 py-3.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-pink-500 fill-pink-500" /> Try Interactive Demo
            </a>
          </div>

          <div className="pt-6 border-t border-slate-200/60 flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <img className="w-7 h-7 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="User" />
                <img className="w-7 h-7 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" alt="User" />
                <img className="w-7 h-7 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="User" />
              </div>
              <span className="font-bold text-slate-800">15,000+ Students & Candidates</span>
            </div>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-time Audio AI</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Granular Feedback</span>
          </div>
        </div>

        {/* Hero Preview Card */}
        <div className="lg:col-span-5 relative">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 relative z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-500 uppercase bg-indigo-50 px-2.5 py-1 rounded flex items-center gap-1">
                <Bot className="w-3 h-3 text-indigo-600" /> LIVE ADAPTIVE EVALUATOR
              </span>
            </div>

            <div className={`space-y-4 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 min-h-[120px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                    <Brain className="w-4 h-4 text-pink-500" /> AI Interviewer
                  </div>
                  <span className="text-[9px] font-extrabold text-indigo-600 bg-gradient-to-r from-indigo-50 to-pink-50 px-2 py-0.5 rounded uppercase border border-indigo-100/50">
                    {activeData.topic}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  "{activeData.question}"
                </p>
              </div>

              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl space-y-2 shadow-sm ml-4 min-h-[90px]">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-100">
                  <span>Candidate Response</span>
                  <Mic className="w-3.5 h-3.5 text-pink-300" />
                </div>
                <p className="text-xs text-white/95 leading-relaxed italic">
                  "{activeData.answer}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                  <span className="block text-[10px] font-extrabold text-emerald-700 uppercase">SCORE</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-900">{activeData.score}</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                  <span className="block text-[10px] font-extrabold text-indigo-700 uppercase">SUGGESTION</span>
                  <span className="text-xs sm:text-sm font-bold text-indigo-900">{activeData.suggestion}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20 -z-10 animate-pulse"></div>
        </div>
      </section>

      {/* 4. Impact Metrics Bar */}
      <section className="bg-slate-900 text-white py-10 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">15,000+</div>
            <p className="text-xs text-slate-400 font-medium">Active Candidates</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">94.8%</div>
            <p className="text-xs text-slate-400 font-medium">Exam Pass Rate</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-amber-400">250,000+</div>
            <p className="text-xs text-slate-400 font-medium">Questions Evaluated</p>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400">4.9/5</div>
            <p className="text-xs text-slate-400 font-medium">Candidate Satisfaction</p>
          </div>
        </div>
      </section>

      {/* 5. How It Works - Workflow */}
      <section id="workflow" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase">3-STEP WORKFLOW</span>
          <h2 className="text-3xl font-extrabold text-slate-900">How InterviewMate Prepares You</h2>
          <p className="text-xs text-slate-500">Master your subject in three simple steps before stepping into the viva room.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 font-black text-lg flex items-center justify-center">01</div>
            <h3 className="font-bold text-base text-slate-900">Upload Syllabus or Resume</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Drop your course outline, lab topics, thesis abstract, or job description. Our AI builds a custom evaluation model instantly.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative space-y-4">
            <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 font-black text-lg flex items-center justify-center">02</div>
            <h3 className="font-bold text-base text-slate-900">Engage in Voice AI Viva</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Answer real-time questions using natural speech. The AI listens, adapts to your depth, and asks follow-up probing questions.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 font-black text-lg flex items-center justify-center">03</div>
            <h3 className="font-bold text-base text-slate-900">Get Granular Insights</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Receive a comprehensive feedback score detailing technical gaps, structural accuracy, clarity, and Big-O nuances.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Interactive Live Demo Section */}
      <section id="demo" className="py-16 bg-slate-950 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold tracking-wider text-pink-400 uppercase flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> INTERACTIVE LIVE DEMO
            </span>
            <h2 className="text-3xl font-black text-white">Experience AI Interviewing Right Now</h2>
            <p className="text-xs text-slate-400">
              Refresh the page or click below to switch questions randomly from our repository.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" /> Topic: <span className="text-pink-400 uppercase">{demoQuestion.topic}</span>
                </span>
              </div>
              <button 
                onClick={shuffleDemoQuestion} 
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try Another Question
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase">AI QUESTION</span>
              <p className="text-sm font-medium text-slate-100 leading-relaxed">
                "{demoQuestion.question}"
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Your Answer Preview:</span>
                <button 
                  onClick={() => setIsRecording(!isRecording)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    isRecording 
                      ? 'bg-rose-600 text-white animate-pulse' 
                      : 'bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-90 text-white'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isRecording ? 'Stop Recording' : 'Speak Answer'}
                </button>
              </div>

              <textarea 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-pink-500 transition-all resize-none"
                rows="3"
                placeholder="Type your answer here or click 'Speak Answer' to test..."
                defaultValue={isRecording ? demoQuestion.answer : ""}
              ></textarea>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button 
                onClick={() => setDemoEvaluated(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md"
              >
                Evaluate Answer
              </button>

              {demoEvaluated && (
                <div className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Score: {demoQuestion.score} ({demoQuestion.suggestion})
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Comprehensive Feature Grid */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase">POWERFUL FEATURES</span>
          <h2 className="text-3xl font-extrabold text-slate-900">Engineered for Technical Mastery</h2>
          <p className="text-xs text-slate-500">Everything you need to boost confidence and outperform standard metrics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: "Probing AI Follow-ups", desc: "Just like real professors, our AI asks progressive follow-ups if your first response lacks depth." },
            { icon: FileCheck, title: "Syllabus Context Mapping", desc: "Upload PDF syllabi or lecture slides to automatically extract target technical domains." },
            { icon: BarChart3, title: "Weakness Heatmaps", desc: "Identify exact concepts where you stumble—from Big-O analysis to system concurrency." },
            { icon: Target, title: "Custom Scoring Rubrics", desc: "Set strict university grading rubrics or standard corporate interview benchmarks." },
            { icon: Globe2, title: "Multi-Domain Support", desc: "Tailored mode for Computer Science, Electrical Engineering, Business, and Medical vivas." },
            { icon: Users2, title: "Peer Benchmark Metrics", desc: "Compare your performance percentile with thousands of candidates in your domain." }
          ].map((f, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <f.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Target Audience Section */}
      <section className="py-20 bg-slate-100/60 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase">TARGET AUDIENCE</span>
            <h2 className="text-3xl font-extrabold text-slate-900">Who Benefits Most From InterviewMate?</h2>
            <p className="text-xs text-slate-500">Our solution is tailored for key benchmark situations across academia and industry.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: Briefcase, title: 'Job Seekers', desc: 'Software, Tech, Product & Corporate Roles' },
              { icon: GraduationCap, title: 'University Students', desc: 'Viva Voce, Lab Defense & Thesis Defense' },
              { icon: UserCheck, title: 'Internship Applicants', desc: 'First Round & Screening Oral Exams' },
              { icon: Award, title: 'Researchers', desc: 'Grant Defense & Dissertation Screenings' },
              { icon: ShieldCheck, title: 'Certified Pros', desc: 'Executive, Healthcare & Finance Credentials' }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-indigo-50 to-pink-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100/50">
                  <item.icon className="w-5 h-5 text-pink-500" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Pricing Section */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase">PRICING PLANS</span>
          <h2 className="text-3xl font-extrabold text-slate-900">Simple, Transparent Pricing</h2>
          <p className="text-xs text-slate-500">Choose the right plan to boost your viva performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Starter */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-slate-900">Free Starter</h3>
              <div className="text-3xl font-black text-slate-900">$0 <span className="text-xs font-normal text-slate-500">/ forever</span></div>
              <p className="text-xs text-slate-500">Perfect for exploring the platform and testing sample viva questions.</p>
              <ul className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 3 AI Mock Sessions / month</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Standard Question Bank</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Basic Score Card</li>
              </ul>
            </div>
            <Link to="/signup" className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 rounded-xl transition-all">Get Started Free</Link>
          </div>

          {/* Student Pro */}
          <div className="bg-slate-900 text-white p-8 rounded-2xl border border-slate-800 space-y-6 flex flex-col justify-between relative shadow-xl">
            <div className="absolute -top-3 right-6 bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</div>
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-white">Student Pro</h3>
              <div className="text-3xl font-black text-white">$12 <span className="text-xs font-normal text-slate-400">/ month</span></div>
              <p className="text-xs text-slate-400">Designed for university viva prep, thesis defense, and midterms.</p>
              <ul className="space-y-3 pt-4 border-t border-slate-800 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited AI Mock Vivas</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> PDF Syllabus & Slide Uploads</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Real-time Voice & Adaptive Follow-ups</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Comprehensive Analysis & Heatmaps</li>
              </ul>
            </div>
            <Link to="/signup" className="w-full text-center bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-90 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md">Upgrade to Pro</Link>
          </div>

          {/* Institutional / Career */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-slate-900">Career & Enterprise</h3>
              <div className="text-3xl font-black text-slate-900">$29 <span className="text-xs font-normal text-slate-500">/ month</span></div>
              <p className="text-xs text-slate-500">For job seekers, tech placement candidates, and research labs.</p>
              <ul className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> All Pro Features Included</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Custom Job Description Matching</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Mock Technical Board Panels</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Priority 24/7 Expert Support</li>
              </ul>
            </div>
            <Link to="/signup" className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all">Choose Enterprise</Link>
          </div>
        </div>
      </section>

      {/* 10. Footer Section */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <DashboardExactLogo />
            <p className="text-[11px] text-slate-500 leading-relaxed pt-2">
              Empowering students and job candidates with AI-driven voice vivas and adaptive oral examinations.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">Product</h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#workflow" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#demo" className="hover:text-white transition-colors">Live Demo</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">Domains</h4>
            <ul className="space-y-2 text-[11px]">
              <li><span className="hover:text-white transition-colors">Computer Science</span></li>
              <li><span className="hover:text-white transition-colors">Thesis Defense</span></li>
              <li><span className="hover:text-white transition-colors">Software Engineering</span></li>
              <li><span className="hover:text-white transition-colors">System Design</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">Account</h4>
            <ul className="space-y-2 text-[11px]">
              <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
              <li><Link to="/support" className="hover:text-white transition-colors">Support & FAQ</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-6 border-t border-slate-800/80 text-center text-[10px] text-slate-600">
          © {new Date().getFullYear()} InterviewMate AI. All rights reserved.
        </div>
      </footer>

    </div>
  );
}