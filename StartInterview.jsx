import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Briefcase, BookOpen, FileText, Award, ShieldCheck, ChevronLeft, ArrowRight, Upload, X, ShieldAlert } from 'lucide-react';
import FileTypeIcon from '../FileTypeIcon';
import { createInterviewSession } from '../../api';

export default function StartInterview() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [stepError, setStepError] = useState('');

  // Form Data State
  const [formData, setFormData] = useState({
    purpose: 'Job Interview',
    customPurpose: '',
    type: 'Technical & Coding Viva',
    difficulty: 'Intermediate',
    level: 'Mid-Level',
    duration: '15 Mins',
    questions: '10 Questions',
    mode: 'Audio + Video',
    materials: null,
  });

  const stepsList = [
    'Purpose',
    'Type',
    'Difficulty',
    'Level',
    'Duration',
    'Questions',
    'Mode',
    'Materials',
    'Preview',
  ];

  const purposeOptions = [
    {
      id: 'Job Interview',
      title: 'Job Interview',
      desc: 'Prepare for corporate technical & behavioral panels',
      icon: Briefcase,
      underTheHood: 'Selecting "Job Interview" prompts the AI to focus heavily on behavioral alignment metrics, STAR response schemas, and deep technological concepts.',
    },
    {
      id: 'Course/Subject Viva',
      title: 'Course/Subject Viva',
      desc: 'University end-of-semester oral examinations',
      icon: BookOpen,
      underTheHood: 'Prompts the AI to focus on core academic fundamentals, definitions, and syllabus-based theoretical questions.',
    },
    {
      id: 'Internship Interview',
      title: 'Internship Interview',
      desc: 'Entry-level conversion and placement test prep',
      icon: FileText,
      underTheHood: 'Focuses on basic problem solving, willingness to learn, and foundational concepts.',
    },
    {
      id: 'Academic/Oral Exam',
      title: 'Academic/Oral Exam',
      desc: 'Scholarships, PhD defense and board assessments',
      icon: Award,
      underTheHood: 'Evaluates critical thinking, research methodologies, and domain depth.',
    },
    {
      id: 'Certification Prep',
      title: 'Certification Prep',
      desc: 'Specialized licensing (CFA, NCLEX, PMP, AWS)',
      icon: ShieldCheck,
      underTheHood: 'Simulates exam-specific situational questions and scenario analysis.',
    },
  ];

  const getDynamicTypes = (purpose) => {
    if (purpose === 'Course/Subject Viva' || purpose === 'Academic/Oral Exam') {
      return [
        { id: 'Subject/Course Viva', label: 'Subject/Course Viva', desc: 'Core course concepts & syllabus theory' },
        { id: 'Lab/Practical Viva', label: 'Lab/Practical Viva', desc: 'Code tracing, output analysis & lab experiments' },
        { id: 'Thesis/Project Defense', label: 'Thesis/Project Defense', desc: 'Architecture, methodology & presentation' },
        { id: 'Comprehensive Board Viva', label: 'Comprehensive Board Viva', desc: 'Overall major degree syllabus evaluation' },
      ];
    }

    if (purpose === 'Internship Interview') {
      return [
        { id: 'Basic Technical Viva', label: 'Basic Technical Viva', desc: 'Fundamentals of programming & CS core' },
        { id: 'Problem Solving & Aptitude', label: 'Problem Solving & Aptitude', desc: 'Logical thinking & basic puzzles' },
        { id: 'Behavioral & Learning Mindset', label: 'Behavioral & Learning Mindset', desc: 'Soft skills, adaptability & STAR answers' },
        { id: 'General HR', label: 'General HR', desc: 'Introduction, career expectations & background' },
      ];
    }

    return [
      { id: 'Technical & Coding Viva', label: 'Technical & Coding Viva', desc: 'Data structures, algorithms & coding problems' },
      { id: 'Domain Specific', label: 'Domain Specific (Web/AI/App)', desc: 'Frontend, Backend, DevOps or Data Science stack' },
      { id: 'Behavioral & STAR', label: 'Behavioral & STAR Method', desc: 'Situational leadership, conflict & culture fit' },
      { id: 'System Design', label: 'System Design & Architecture', desc: 'Scalability, microservices & database design' },
    ];
  };

  const handlePurposeChange = (purposeId) => {
    const newTypes = getDynamicTypes(purposeId);
    setFormData({
      ...formData,
      purpose: purposeId,
      type: newTypes[0].label,
    });
  };

  // File Upload Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFormData({ ...formData, materials: file.name });
      setStepError('');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFormData({ ...formData, materials: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNext = async () => {
    if (currentStep === 8 && !selectedFile) {
      setStepError('Please upload a PDF, DOCX, or PPTX document to continue - every question in this interview is generated from it.');
      return;
    }
    setStepError('');

    if (currentStep < 9) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    if (!selectedFile) {
      setSubmitError('A document is required to start this interview. Please go back and upload one.');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      const { data } = await createInterviewSession(formData, selectedFile);
      navigate('/mock-interviews', {
        state: {
          sessionId: data.session.id,
          question: data.question,
          session: data.session,
        },
      });
    } catch (error) {
      setIsSubmitting(false);
      setSubmitError(
        error.response?.data?.message || 'Could not start the interview session. Please try again.'
      );
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const selectedPurposeDetails = purposeOptions.find((p) => p.id === formData.purpose);

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        {/* Header & Indicator */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Set Up Your AI Evaluation
          </h1>
          <span className="text-xs font-bold text-slate-400">
            Step {currentStep} of 9
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="grid grid-cols-9 gap-1.5">
            {stepsList.map((step, idx) => {
              const stepNumber = idx + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep;

              return (
                <div key={idx} className="space-y-1.5">
                  <div
                    className={`h-1 rounded-full transition-all duration-300 ${
                      isActive || isCompleted ? 'bg-[#5846F6]' : 'bg-slate-200'
                    }`}
                  ></div>
                  <span
                    className={`text-[10px] font-extrabold block truncate ${
                      isActive ? 'text-[#5846F6]' : 'text-slate-400'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 1: PURPOSE */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">What are you preparing for?</h2>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Our cognitive evaluator adjusts standard rubrics based on this context.
                  </p>
                </div>

                <div className="space-y-3">
                  {purposeOptions.map((item) => {
                    const Icon = item.icon;
                    const isSelected = formData.purpose === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handlePurposeChange(item.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#5846F6] bg-indigo-50/30 ring-2 ring-[#5846F6]/10'
                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-3 rounded-xl ${
                              isSelected ? 'bg-indigo-100 text-[#5846F6]' : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.desc}</p>
                          </div>
                        </div>

                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-[#5846F6]">
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#5846F6]"></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Custom / Other Purpose</label>
                  <input
                    type="text"
                    placeholder="Describe what you are preparing for..."
                    value={formData.customPurpose}
                    onChange={(e) => setFormData({ ...formData, customPurpose: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5846F6] text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: DYNAMIC TYPE */}
            {currentStep === 2 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Select Interview Type</h2>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Showing evaluation formats customized for <span className="text-[#5846F6] font-bold">{formData.purpose}</span>
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getDynamicTypes(formData.purpose).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setFormData({ ...formData, type: t.label })}
                      className={`p-4 rounded-xl text-left border transition-all ${
                        formData.type === t.label 
                          ? 'border-[#5846F6] bg-indigo-50/50 text-[#5846F6] ring-2 ring-[#5846F6]/10' 
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900">{t.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: DIFFICULTY */}
            {currentStep === 3 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
                <h2 className="text-xl font-black text-slate-900">Select Difficulty</h2>
                <div className="grid grid-cols-3 gap-3">
                  {['Easy', 'Intermediate', 'Hard'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setFormData({ ...formData, difficulty: d })}
                      className={`p-4 rounded-xl text-xs font-bold border transition-all ${
                        formData.difficulty === d ? 'border-[#5846F6] bg-indigo-50 text-[#5846F6]' : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: LEVEL */}
            {currentStep === 4 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
                <h2 className="text-xl font-black text-slate-900">Target Experience Level</h2>
                <div className="grid grid-cols-3 gap-3">
                  {['Junior / Entry', 'Mid-Level', 'Senior / Staff'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setFormData({ ...formData, level: l })}
                      className={`p-4 rounded-xl text-xs font-bold border transition-all ${
                        formData.level === l ? 'border-[#5846F6] bg-indigo-50 text-[#5846F6]' : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: DURATION */}
            {currentStep === 5 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
                <h2 className="text-xl font-black text-slate-900">Select Duration</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['5 Mins', '7 Mins', '10 Mins', '12 Mins', '15 Mins', '20 Mins'].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setFormData({ ...formData, duration: dur })}
                      className={`p-4 rounded-xl text-xs font-bold border transition-all ${
                        formData.duration === dur
                          ? 'border-[#5846F6] bg-indigo-50 text-[#5846F6] ring-2 ring-[#5846F6]/10'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: QUESTIONS */}
            {currentStep === 6 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
                <h2 className="text-xl font-black text-slate-900">Number of Questions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 11 }, (_, i) => `${i + 5} Questions`).map((q) => (
                    <button
                      key={q}
                      onClick={() => setFormData({ ...formData, questions: q })}
                      className={`p-3.5 rounded-xl text-xs font-bold border transition-all ${
                        formData.questions === q
                          ? 'border-[#5846F6] bg-indigo-50 text-[#5846F6] ring-2 ring-[#5846F6]/10'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7: MODE */}
            {currentStep === 7 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
                <h2 className="text-xl font-black text-slate-900">Evaluation Mode</h2>
                <div className="grid grid-cols-3 gap-3">
                  {['Audio + Video', 'Audio Only', 'Text Response'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setFormData({ ...formData, mode: m })}
                      className={`p-4 rounded-xl text-xs font-bold border transition-all ${
                        formData.mode === m ? 'border-[#5846F6] bg-indigo-50 text-[#5846F6]' : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 8: MATERIALS (UPDATED WITH REAL FILE UPLOAD) */}
            {currentStep === 8 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
                <h2 className="text-xl font-black text-slate-900">Upload Your Document</h2>
                <p className="text-xs text-slate-400">
                  Required. Every question in this interview is generated strictly from this document's content -
                  nothing generic, nothing outside what it actually contains.
                </p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.pptx"
                  className="hidden"
                />

                {!selectedFile ? (
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="p-8 border-2 border-dashed border-slate-200 hover:border-[#5846F6] rounded-xl text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-indigo-50/20 group"
                  >
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#5846F6] mx-auto mb-2 transition-colors" />
                    <span className="text-xs font-bold text-[#5846F6]">Click to upload a document (PDF, DOCX, PPTX)</span>
                    <p className="text-[10px] text-slate-400 mt-1">Maximum file size: 10MB</p>
                  </div>
                ) : (
                  <div className="p-4 border border-indigo-100 bg-indigo-50/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white rounded-lg shadow-sm">
                        <FileTypeIcon filename={selectedFile.name} className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleRemoveFile}
                      className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {stepError && (
                  <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> {stepError}
                  </p>
                )}
              </div>
            )}

            {/* STEP 9: PREVIEW */}
            {currentStep === 9 && (
              <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80">
                <h2 className="text-xl font-black text-slate-900">Review & Start Session</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Your AI evaluator is configured and ready. Click below to launch the live interview environment.
                </p>
                {submitError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  currentStep === 1
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#5846F6] hover:bg-[#4735E5] text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>
                      {currentStep === 9 ? 'Start AI Session' : `Continue to Step ${currentStep + 1}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Simulation Summary */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 h-fit">
            <h3 className="font-extrabold text-slate-900 text-sm">Simulation Summary</h3>

            <div className="space-y-3.5 text-xs font-medium">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Purpose</span>
                <span className="font-extrabold text-emerald-600">
                  {formData.purpose || 'Not configured'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Interview Type</span>
                <span className={`font-extrabold ${currentStep >= 2 ? 'text-slate-900' : 'text-indigo-400'}`}>
                  {currentStep >= 2 ? formData.type : 'Not configured'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Difficulty</span>
                <span className={`font-extrabold ${currentStep >= 3 ? 'text-slate-900' : 'text-indigo-400'}`}>
                  {currentStep >= 3 ? formData.difficulty : 'Not configured'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Level</span>
                <span className={`font-extrabold ${currentStep >= 4 ? 'text-slate-900' : 'text-indigo-400'}`}>
                  {currentStep >= 4 ? formData.level : 'Not configured'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Duration</span>
                <span className={`font-extrabold ${currentStep >= 5 ? 'text-slate-900' : 'text-indigo-400'}`}>
                  {currentStep >= 5 ? formData.duration : 'Not configured'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Uploaded File</span>
                <span className={`font-extrabold truncate max-w-[120px] ${formData.materials ? 'text-[#5846F6]' : 'text-slate-400'}`}>
                  {formData.materials || 'None'}
                </span>
              </div>
            </div>

            {/* Under The Hood */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                UNDER THE HOOD
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                {selectedPurposeDetails?.underTheHood}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}