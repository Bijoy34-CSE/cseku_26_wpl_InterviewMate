import React, { useState, useMemo } from 'react';
import Sidebar from '../Sidebar';
import { Search, ChevronDown, Star, Sparkles } from 'lucide-react';

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

  const toggleStar = (id) => {
    setStarred((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePracticeClick = (question) => {
    alert(`🎯 Practice Session Started!\n\nQuestion: "${question.title}"\nTopic: ${question.topic}\nDifficulty: ${question.difficulty}`);
  };

  const filterOptions = useMemo(() => {
    const prepTypes = ['All Prep Types', ...new Set(fullDatabase.map((q) => q.prepType))];
    const categories = ['All Categories', ...new Set(fullDatabase.map((q) => q.category))];
    const difficulties = ['All Difficulties', ...new Set(fullDatabase.map((q) => q.difficulty))];
    const topics = ['All Topics', ...new Set(fullDatabase.map((q) => q.topic))];

    return { prepTypes, categories, difficulties, topics };
  }, []);

  // AI Smart Engine: ফিল্টারিং লজিক + অন-দ্য-ফ্লাই প্রশ্ন জেনারেটর (ফাঁকা দেখাবে না)
  const filteredQuestions = useMemo(() => {
    let matches = fullDatabase.filter((q) => {
      const matchesSearch =
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPrep = prepType === 'All' || prepType === 'All Prep Types' || q.prepType === prepType;
      const matchesCat = category === 'All' || category === 'All Categories' || q.category === category;
      const matchesDiff = difficulty === 'All' || difficulty === 'All Difficulties' || q.difficulty === difficulty;
      const matchesTopic = topic === 'All' || topic === 'All Topics' || q.topic === topic;

      return matchesSearch && matchesPrep && matchesCat && matchesDiff && matchesTopic;
    });

    // এজেন্ট আচরণ: ফিল্টারের রেজাল্ট ১০টির কম হলে অন-দ্য-ফ্লাই রিলেটেড প্রশ্ন জেনারেট/ম্যাচ করে ১০টি পূরণ করবে
    if (matches.length < 10) {
      const existingIds = new Set(matches.map((q) => q.id));
      const dynamicFallback = fullDatabase.filter((q) => {
        if (existingIds.has(q.id)) return false;

        const activePrep = prepType !== 'All' && prepType !== 'All Prep Types' ? prepType : q.prepType;
        const activeCat = category !== 'All' && category !== 'All Categories' ? category : q.category;
        const activeDiff = difficulty !== 'All' && difficulty !== 'All Difficulties' ? difficulty : q.difficulty;
        const activeTopic = topic !== 'All' && topic !== 'All Topics' ? topic : q.topic;

        return (
          q.prepType === activePrep ||
          q.category === activeCat ||
          q.difficulty === activeDiff ||
          q.topic === activeTopic
        );
      });

      matches = [...matches, ...dynamicFallback].slice(0, 12);
    }

    return matches;
  }, [searchTerm, prepType, category, difficulty, topic]);

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
                  <Sparkles className="w-3 h-3" /> Agentic AI Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Sharpen your skills with targeted practice from 1,000+ AI curated questions
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
            {filteredQuestions.map((q) => (
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
          </div>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/40 text-xs font-medium text-slate-400">
          <span>
            Showing 1-{filteredQuestions.length} of {fullDatabase.length} curated questions
          </span>

          <div className="flex items-center gap-1.5">
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold transition-all">
              Previous
            </button>
            <button className="w-8 h-8 bg-indigo-50 text-[#5846F6] font-extrabold rounded-lg flex items-center justify-center">
              1
            </button>
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-bold transition-all">
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}