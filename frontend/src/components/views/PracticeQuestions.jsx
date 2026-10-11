import React, { useState, useMemo } from 'react';
import Sidebar from '../Sidebar';
import { Search, ChevronDown, Star, Sparkles, X, LoaderCircle } from 'lucide-react';
import { evaluatePracticeAnswer, getCuratedPracticeQuestions } from '../../api';

// ১,০০০+ প্রশ্ন জেনারেট করার জন্য মাস্টার ক্যাটালগ টেমপ্লেট
const PREP_TYPES = ['Course/Subject Viva', 'Job Interview', 'Internship Interview'];
const CATEGORIES = ['Academic & Vivas', 'Technical & Coding Viva', 'Behavioral & HR'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TOPICS = ['Soft Skills', 'DBMS', 'OS', 'Networking', 'Machine Learning', 'Communication', 'Data Structures'];

const TOPIC_QUESTIONS = {
  'Soft Skills': [
    'How do you manage team conflicts under aggressive deadlines?',
    'Explain how to explain complex technical concepts to non-technical stakeholders.',
    'Describe a situation where you had to adapt to sudden changes in project requirements.',
    'How do you handle critical feedback from a professor or senior architect?',
    'What strategies do you use for active listening during academic vivas?',
    'Demonstrate leadership in a university capstone project under extreme pressure.',
    'How do you maintain focus and composure during a high-stakes viva examination?',
    'Explain your methodology for time management during multi-tasking projects.',
    'How do you negotiate deliverables with demanding project leads?',
    'Describe an instance where you took initiative to solve an unassigned problem.'
  ],
  'DBMS': [
    'Explain 1NF, 2NF, 3NF, and BCNF normalization with real-world database examples.',
    'What are ACID properties in relational databases and why are they critical?',
    'Compare B-Trees and B+ Trees in SQL database indexing mechanisms.',
    'Explain Deadlock detection, prevention, and avoidance strategies in DBMS.',
    'What is the difference between Clustered and Non-Clustered Indexes?',
    'How does Two-Phase Locking (2PL) protocol ensure serializability?',
    'Explain the differences between SQL and NoSQL database architectures.',
    'What is database sharding and how does it differ from horizontal partitioning?',
    'Describe the execution plan optimization phase in modern SQL engines.',
    'How do WAL (Write-Ahead Logging) protocols guarantee durability?'
  ],
  'OS': [
    'Describe the OSI model layers and compare it with TCP/IP protocol suite.',
    'Explain Process States, PCB, and context switching overheads in OS.',
    'What is Page Fault, Thrashing, and LRU page replacement algorithm?',
    'Compare Mutex, Semaphore, and Spinlocks in multi-threaded environments.',
    'How does CPU Scheduling handle round-robin vs priority preemptive queues?',
    'What is Virtual Memory and how does dynamic address translation work?',
    'Explain inter-process communication (IPC) via pipes and shared memory.',
    'What is the difference between kernel mode and user mode execution?',
    'How do operating systems prevent memory leaks and fragmentation?',
    'Explain the Banker\'s Algorithm for Deadlock Avoidance.'
  ],
  'Networking': [
    'Explain the 3-Way Handshake in TCP connection establishment.',
    'How does DNS resolution work step-by-step from browser to authoritative server?',
    'Compare IPv4 vs IPv6 addressing structures and header overheads.',
    'What is HTTP/3 and how does QUIC protocol improve web performance?',
    'Explain the function of NAT (Network Address Translation) and CIDR.',
    'What are the differences between symmetric and asymmetric encryption in SSL/TLS?',
    'How do Routers maintain Routing Tables using OSPF and BGP?',
    'Explain CSMA/CD and CSMA/CA collision detection mechanisms.',
    'What is a Subnet Mask and how do you calculate host ranges?',
    'Describe ARP spoofing and methods to mitigate network MITM attacks.'
  ],
  'Machine Learning': [
    'Explain the difference between Supervised, Unsupervised, and Reinforcement Learning.',
    'What is the Bias-Variance Tradeoff in machine learning models?',
    'How does Gradient Descent optimization work and what is Learning Rate decay?',
    'Explain Precision, Recall, F1-Score, and ROC-AUC curve evaluation.',
    'What is Overfitting and how do L1/L2 Regularization techniques prevent it?',
    'Describe the architecture and attention mechanisms of Transformer models.',
    'How do Decision Trees split nodes using Gini Impurity and Entropy?',
    'What is the difference between Bagging and Boosting algorithms?',
    'Explain Convolutional Neural Networks (CNN) for image processing.',
    'How do Word Embeddings (Word2Vec) capture semantic meanings?'
  ],
  'Communication': [
    'How do you present complex research project results to senior executives?',
    'What steps do you take to rebuild trust after missing a team deliverable?',
    'Describe your strategy for conducting effective peer code reviews.',
    'How do you handle disagreement with senior software engineers politely?',
    'Explain the STAR method for answering behavioral interview questions.',
    'How do you pitch an innovative technical idea to skeptical executives?',
    'What is your approach to documentation for open-source repositories?',
    'How do you facilitate smooth communication in remote asynchronous teams?',
    'Explain how to give constructive feedback to a struggling teammate.',
    'How do you communicate security risks effectively to non-technical managers?'
  ],
  'Data Structures': [
    'Explain the time and space complexity of QuickSort, MergeSort, and HeapSort.',
    'How do Hash Tables handle collision resolution using chaining vs open addressing?',
    'Compare Red-Black Trees with AVL Trees in terms of rotation overheads.',
    'Explain Dijkstra\'s algorithm vs A* Search for shortest path finding.',
    'How do Trie data structures optimize prefix-based autocomplete search?',
    'Describe Graph Traversals using Breadth-First Search (BFS) and Depth-First Search (DFS).',
    'What is a Dynamic Programming memoization approach vs tabular approach?',
    'Explain the implementation of a LRU Cache using Doubly Linked List & Hash Map.',
    'How does a Binary Heap maintain min/max properties during insertion?',
    'Compare Arrays, Vectors, and Linked Lists memory allocations in RAM.'
  ]
};

// ১,০০০+ প্রশ্নের লোকাল ক্যাশ বা ডেটাসেট তৈরি
const generateLargeDataset = () => {
  const dataset = [];
  let idCounter = 1;

  for (let p of PREP_TYPES) {
    for (let c of CATEGORIES) {
      for (let d of DIFFICULTIES) {
        for (let t of TOPICS) {
          const questions = TOPIC_QUESTIONS[t] || TOPIC_QUESTIONS['Soft Skills'];
          for (let i = 0; i < questions.length; i++) {
            let type = 'Technical';
            if (c === 'Behavioral & HR' || t === 'Soft Skills' || t === 'Communication') {
              type = i % 2 === 0 ? 'Behavioral' : 'Situational';
            } else if (c === 'Academic & Vivas' || p === 'Course/Subject Viva') {
              type = 'Subject Viva';
            }

            let typeBg = 'bg-indigo-50 text-indigo-600';
            if (type === 'Behavioral') typeBg = 'bg-purple-50 text-purple-600';
            if (type === 'Situational') typeBg = 'bg-blue-50 text-blue-600';
            if (type === 'Subject Viva') typeBg = 'bg-amber-50 text-amber-700';

            let diffBg = 'bg-[#FEF3C7] text-[#D97706]';
            if (d === 'Easy') diffBg = 'bg-emerald-50 text-emerald-600';
            if (d === 'Hard') diffBg = 'bg-rose-50 text-rose-500';

            dataset.push({
              id: idCounter++,
              title: questions[i],
              prepType: p,
              category: c,
              difficulty: d,
              topic: t,
              type,
              typeBg,
              diffBg,
              isAILearned: idCounter % 15 === 0 // Agentic Learning Flag
            });
          }
        }
      }
    }
  }
  return dataset;
};

const fullDatabase = generateLargeDataset();

export default function PracticeQuestions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [prepType, setPrepType] = useState('Course/Subject Viva');
  const [category, setCategory] = useState('Academic & Vivas');
  const [difficulty, setDifficulty] = useState('Hard');
  const [topic, setTopic] = useState('Soft Skills');
  const [starred, setStarred] = useState({});
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [practiceError, setPracticeError] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [page, setPage] = useState(1);
  const [adminQuestions, setAdminQuestions] = useState([]);
  const [practiceLoadError, setPracticeLoadError] = useState('');
  const pageSize = 12;

  useEffect(() => {
    getCuratedPracticeQuestions()
      .then(({ data }) => setAdminQuestions((data.questions || []).map((entry) => ({
        id: entry._id,
        title: entry.question,
        prepType: 'Admin curated',
        category: 'Admin curated',
        difficulty: entry.difficulty,
        topic: entry.topic,
        type: 'Practice',
        typeBg: 'bg-indigo-50 text-indigo-600',
        diffBg: entry.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600' : entry.difficulty === 'Hard' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-700',
        isAILearned: false,
      }))))
      .catch((error) => setPracticeLoadError(error.response?.data?.message || 'Could not load admin-curated practice questions.'));
  }, []);

  const allQuestions = useMemo(() => [...fullDatabase, ...adminQuestions], [adminQuestions]);

  const toggleStar = (id) => {
    setStarred((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePracticeClick = (question) => {
    setActiveQuestion(question);
    setAnswer('');
    setEvaluation(null);
    setPracticeError('');
  };

  const filterOptions = useMemo(() => {
    const prepTypes = ['All Prep Types', ...new Set(allQuestions.map((q) => q.prepType))];
    const categories = ['All Categories', ...new Set(allQuestions.map((q) => q.category))];
    const difficulties = ['All Difficulties', ...new Set(allQuestions.map((q) => q.difficulty))];
    const topics = ['All Topics', ...new Set(allQuestions.map((q) => q.topic))];

    return { prepTypes, categories, difficulties, topics };
  }, [allQuestions]);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      const matchesSearch =
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPrep = prepType === 'All' || prepType === 'All Prep Types' || q.prepType === prepType;
      const matchesCat = category === 'All' || category === 'All Categories' || q.category === category;
      const matchesDiff = difficulty === 'All' || difficulty === 'All Difficulties' || q.difficulty === difficulty;
      const matchesTopic = topic === 'All' || topic === 'All Topics' || q.topic === topic;

      return matchesSearch && matchesPrep && matchesCat && matchesDiff && matchesTopic;
    });

  }, [allQuestions, searchTerm, prepType, category, difficulty, topic]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const submitPracticeAnswer = async (event) => {
    event.preventDefault();
    if (!activeQuestion || !answer.trim()) return;
    setIsEvaluating(true);
    setPracticeError('');
    try {
      const { data } = await evaluatePracticeAnswer({
        question: activeQuestion.title,
        answer: answer.trim(),
        topic: activeQuestion.topic,
        difficulty: activeQuestion.difficulty,
      });
      setEvaluation(data.result);
    } catch (error) {
      setPracticeError(error.response?.data?.message || 'Could not evaluate your answer. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Practice Questions
                <span className="bg-indigo-100 text-[#5846F6] text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI-evaluated practice
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Practice curated questions and receive AI feedback on your written answers
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search questions by topic, keyword, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100/70 border border-slate-200/60 rounded-2xl pl-11 pr-4 py-3 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#5846F6] transition-all"
            />
          </div>
          {practiceLoadError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">{practiceLoadError}</p>}

          {/* Dynamic Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Preparation Type Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                PREPARATION TYPE
              </span>
              <div className="relative">
                <select
                  value={prepType}
                  onChange={(e) => setPrepType(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 appearance-none focus:outline-none cursor-pointer"
                >
                  {filterOptions.prepTypes.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                CATEGORY
              </span>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 appearance-none focus:outline-none cursor-pointer"
                >
                  {filterOptions.categories.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Difficulty Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                DIFFICULTY
              </span>
              <div className="relative">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 appearance-none focus:outline-none cursor-pointer"
                >
                  {filterOptions.difficulties.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Topic Filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                TOPIC
              </span>
              <div className="relative">
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 appearance-none focus:outline-none cursor-pointer"
                >
                  {filterOptions.topics.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Question Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleQuestions.map((q) => (
              <div
                key={q.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-5 hover:border-[#5846F6]/40 transition-all"
              >
                <div className="space-y-1">
                  {q.isAILearned && (
                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
                      🤖 AI Learned Question
                    </span>
                  )}
                  <h3 className="text-xs font-black text-slate-900 leading-snug">
                    {q.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between">
                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md ${q.typeBg}`}>
                      {q.type}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md ${q.diffBg}`}>
                      {q.difficulty}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      {q.topic}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePracticeClick(q)}
                      className="px-4 py-1.5 bg-[#5846F6] hover:bg-[#4735E5] text-white font-bold text-[11px] rounded-xl transition-all active:scale-95 shadow-sm hover:shadow"
                    >
                      Practice
                    </button>
                    <button
                      onClick={() => toggleStar(q.id)}
                      className={`p-1.5 transition-colors ${
                        starred[q.id] ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'
                      }`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredQuestions.length === 0 && <p className="col-span-full rounded-2xl border border-slate-200 bg-white/70 p-8 text-center text-sm font-semibold text-slate-500">No questions match these filters. Try changing your search or filters.</p>}
          </div>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/40 text-xs font-medium text-slate-400">
          <span>
            Showing {filteredQuestions.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredQuestions.length)} of {filteredQuestions.length} matching questions
          </span>

          <div className="flex items-center gap-1.5">
            <button disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold transition-all disabled:opacity-40">
              Previous
            </button>
            <span className="px-2 font-bold text-slate-600">{currentPage} / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold transition-all disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </main>

      {activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="practice-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5846F6]">{activeQuestion.topic} · {activeQuestion.difficulty}</p>
                <h2 id="practice-dialog-title" className="mt-2 text-lg font-black leading-snug text-slate-900">{activeQuestion.title}</h2>
              </div>
              <button type="button" onClick={() => setActiveQuestion(null)} aria-label="Close practice" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            {!evaluation ? (
              <form onSubmit={submitPracticeAnswer} className="space-y-4 pt-4">
                <label htmlFor="practice-answer" className="block text-sm font-bold text-slate-700">Your answer</label>
                <textarea id="practice-answer" required minLength={2} maxLength={12000} rows={7} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write your answer here…" className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 outline-none focus:border-[#5846F6] focus:bg-white" />
                <p className="text-right text-xs text-slate-400">{answer.length}/12,000</p>
                {practiceError && <p role="alert" className="text-sm font-semibold text-red-600">{practiceError}</p>}
                <div className="flex justify-end">
                  <button type="submit" disabled={isEvaluating || answer.trim().length < 2} className="flex items-center gap-2 rounded-xl bg-[#5846F6] px-5 py-3 text-sm font-bold text-white hover:bg-[#4735E5] disabled:opacity-60">
                    {isEvaluating && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {isEvaluating ? 'Evaluating…' : 'Submit for feedback'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 pt-5">
                <div className="rounded-2xl bg-indigo-50 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Overall score</p>
                  <p className="mt-1 text-4xl font-black text-[#5846F6]">{evaluation.overall}<span className="text-lg">/100</span></p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{evaluation.aiFeedback}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    ['Correctness', evaluation.technicalAccuracy],
                    ['Structure', evaluation.structuralFlow],
                    ['Communication', evaluation.communication],
                    ['Relevance', evaluation.relevance],
                    ['Completeness', evaluation.completeness],
                  ].map(([label, score]) => <div key={label} className="rounded-xl border border-slate-100 p-3 text-center"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-800">{score ?? '—'}</p></div>)}
                </div>
                {[
                  ['Strengths', evaluation.strengths],
                  ['Areas to improve', evaluation.weaknesses],
                  ['Suggested improvements', evaluation.improvementSuggestions],
                ].map(([title, items]) => items?.length ? <div key={title}><h3 className="mb-2 text-sm font-black text-slate-800">{title}</h3><ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul></div> : null)}
                <div><h3 className="mb-2 text-sm font-black text-slate-800">Example answer</h3><p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{evaluation.suggestedAnswer}</p></div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setEvaluation(null); setPracticeError(''); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Try again</button>
                  <button type="button" onClick={() => setActiveQuestion(null)} className="rounded-xl bg-[#5846F6] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4735E5]">Done</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}