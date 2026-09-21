import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { useUser } from '../../context/UserContext';
import { 
  ChevronRight, 
  X, 
  Mail, 
  Lock, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  LifeBuoy, 
  BookOpen, 
  FileText, 
  MessageSquare, 
  ExternalLink 
} from 'lucide-react';

export default function SettingsView() {
  const navigate = useNavigate();

  // Global User State & Function from Context
  const { user, updateUser, logout } = useUser();

  // Dynamic User Information State (Driven by Context)
  const passwordLastChanged = user?.passwordLastChanged || 'Not recorded';

  // Toggle States
  const [emailNotif, setEmailNotif] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [performanceReports, setPerformanceReports] = useState(true);
  const [practiceSuggestions, setPracticeSuggestions] = useState(false);
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);

  // Form States
  const [speakingSpeed, setSpeakingSpeed] = useState(1.0);
  const [modalityMode, setModalityMode] = useState('voice');
  const [difficulty, setDifficulty] = useState('Adaptive (Auto)');
  const [questionCount, setQuestionCount] = useState('10 Questions');
  const [feedbackDetail, setFeedbackDetail] = useState('Detailed Rubric');
  const [interviewStyle, setInterviewStyle] = useState('Academic Board');
  const [voiceSpeaker, setVoiceSpeaker] = useState('Dr. Ava (British English)');

  // Modal Control States
  const [activeModal, setActiveModal] = useState(null); // 'email', 'password', 'clearHistory', 'deleteAccount', 'help'
  const [toastMessage, setToastMessage] = useState('');

  // Modal Form Input States
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Toast Notification Trigger
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Handlers for Modal Submissions
  const handleEmailChange = (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    
    // Updates UserContext & localStorage globally
    updateUser({ email: newEmail.trim() });
    
    setActiveModal(null);
    setNewEmail('');
    showToast('Email updated successfully!');
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    
    // Update Context State
    updateUser({ passwordLastChanged: 'Just now' });
    
    setActiveModal(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Password changed successfully!');
  };

  const handleClearHistory = () => {
    setActiveModal(null);
    showToast('Interview history cleared.');
  };

  const handleDeleteAccount = async () => {
    setActiveModal(null);
    alert('Account deleted successfully. Redirecting to login...');
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased relative">
      <Sidebar onHelpClick={() => setActiveModal('help')} />

      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </div>
        )}

        {/* Page Title & Subtitle */}
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Configure system features, AI characteristics, speech and privacy
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Account Settings */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-slate-900">Account Settings</h3>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-bold text-slate-800">Email Address</p>
                  <p className="text-xs font-semibold text-slate-400">{user?.email || ''}</p>
                </div>
                <button 
                  onClick={() => setActiveModal('email')}
                  className="text-xs font-extrabold text-[#5846F6] hover:underline"
                >
                  Change Email
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">Password</p>
                  <p className="text-xs font-semibold text-slate-400">Last changed {passwordLastChanged}</p>
                </div>
                <button 
                  onClick={() => setActiveModal('password')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold rounded-xl transition-all"
                >
                  Change Password
                </button>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-slate-900">Notification Preferences</h3>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Email Notifications</p>
                    <p className="text-[11px] font-semibold text-slate-400">Syllabus changes and updates</p>
                  </div>
                  <button 
                    onClick={() => setEmailNotif(!emailNotif)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${emailNotif ? 'bg-[#5846F6]' : 'bg-slate-200'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${emailNotif ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Interview Reminders</p>
                    <p className="text-[11px] font-semibold text-slate-400">Calendar alarms for practice slots</p>
                  </div>
                  <button 
                    onClick={() => setInterviewReminders(!interviewReminders)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${interviewReminders ? 'bg-[#5846F6]' : 'bg-slate-200'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${interviewReminders ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Performance Reports</p>
                    <p className="text-[11px] font-semibold text-slate-400">Weekly analytics recap and grading</p>
                  </div>
                  <button 
                    onClick={() => setPerformanceReports(!performanceReports)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${performanceReports ? 'bg-[#5846F6]' : 'bg-slate-200'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${performanceReports ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Practice Suggestions</p>
                    <p className="text-[11px] font-semibold text-slate-400">AI tips for current skill gaps</p>
                  </div>
                  <button 
                    onClick={() => setPracticeSuggestions(!practiceSuggestions)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${practiceSuggestions ? 'bg-[#5846F6]' : 'bg-slate-200'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${practiceSuggestions ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Interview Settings */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-slate-900">Interview Settings</h3>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">DEFAULT DIFFICULTY</label>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6] text-slate-800"
                  >
                    <option>Adaptive (Auto)</option>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">DEFAULT QUESTION COUNT</label>
                  <select 
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6] text-slate-800"
                  >
                    <option>5 Questions</option>
                    <option>10 Questions</option>
                    <option>15 Questions</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">PREFERRED MODALITY MODE</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input 
                      type="radio" 
                      name="modality" 
                      checked={modalityMode === 'voice'} 
                      onChange={() => setModalityMode('voice')}
                      className="accent-[#5846F6] w-4 h-4" 
                    />
                    <span>Interactive Voice Mode</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500">
                    <input 
                      type="radio" 
                      name="modality" 
                      checked={modalityMode === 'text'} 
                      onChange={() => setModalityMode('text')}
                      className="accent-[#5846F6] w-4 h-4" 
                    />
                    <span>Structured Text Mode</span>
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* AI Preferences */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-slate-900">AI Preferences</h3>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-bold text-slate-800">Adaptive Difficulty Engine</p>
                  <p className="text-[11px] font-semibold text-slate-400">Increase/decrease difficulty dynamically based on depth</p>
                </div>
                <button 
                  onClick={() => setAdaptiveDifficulty(!adaptiveDifficulty)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${adaptiveDifficulty ? 'bg-[#5846F6]' : 'bg-slate-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${adaptiveDifficulty ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">FEEDBACK DETAIL LEVEL</label>
                  <select 
                    value={feedbackDetail}
                    onChange={(e) => setFeedbackDetail(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6] text-slate-800"
                  >
                    <option>Detailed Rubric</option>
                    <option>Summary Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">INTERVIEW STYLE</label>
                  <select 
                    value={interviewStyle}
                    onChange={(e) => setInterviewStyle(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6] text-slate-800"
                  >
                    <option>Academic Board</option>
                    <option>Corporate HR</option>
                    <option>Technical Lead</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Voice Settings */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-slate-900">Voice Settings</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-end">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">AI VOICE SPEAKER</label>
                  <select 
                    value={voiceSpeaker}
                    onChange={(e) => setVoiceSpeaker(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6] text-slate-800"
                  >
                    <option>Dr. Ava (British English)</option>
                    <option>Alex (American English)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      SPEAKING SPEED ({speakingSpeed.toFixed(1)}X)
                    </label>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.0" 
                    step="0.1"
                    value={speakingSpeed}
                    onChange={(e) => setSpeakingSpeed(parseFloat(e.target.value))}
                    className="w-full accent-[#5846F6] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-800">Auto-play Questions</p>
                <button 
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${autoPlay ? 'bg-[#5846F6]' : 'bg-slate-200'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${autoPlay ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Privacy & Data */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-slate-900">Privacy & Data</h3>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-bold text-slate-800">Manage Syllabus / Resume Contexts</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 cursor-pointer" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">Clear Interview History</p>
                  <p className="text-[11px] font-semibold text-slate-400">Delete score histories and previous voice recordings permanent</p>
                </div>
                <button 
                  onClick={() => setActiveModal('clearHistory')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold rounded-xl transition-all shrink-0"
                >
                  Clear History
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs font-bold text-red-500">Delete All Account Data</p>
                  <p className="text-[11px] font-semibold text-slate-400">This action cannot be undone. All documents will be deleted.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('deleteAccount')}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 text-xs font-extrabold rounded-xl transition-all shrink-0"
                >
                  Delete All
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Actions Footer */}
        <div className="flex items-center justify-between pt-4">
          <button 
            onClick={async () => {
              if (window.confirm('Are you sure you want to log out?')) {
                await logout();
                navigate('/login');
              }
            }}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-extrabold rounded-xl shadow-sm transition-all"
          >
            Logout
          </button>

          <button 
            onClick={() => showToast('Settings saved successfully!')}
            className="px-6 py-2.5 bg-[#5846F6] hover:bg-[#4735E5] text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95"
          >
            Save Settings
          </button>
        </div>

      </main>

      {/* ================= MODALS ================= */}

      {/* Change Email Modal */}
      {activeModal === 'email' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEmailChange} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#5846F6]" />
                <h3 className="font-black text-sm text-slate-900">Change Email Address</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Current Email</label>
                <input type="text" disabled value={user?.email || ''} className="w-full px-3 py-2 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">New Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="Enter new email"
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)} 
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6]" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 text-xs font-extrabold bg-[#5846F6] text-white rounded-xl hover:bg-[#4735E5]">Update Email</button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password Modal */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handlePasswordChange} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#5846F6]" />
                <h3 className="font-black text-sm text-slate-900">Change Password</h3>
              </div>
              <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Current Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6]" 
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">New Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6]" 
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Confirm New Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6]" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 text-xs font-extrabold bg-[#5846F6] text-white rounded-xl hover:bg-[#4735E5]">Update Password</button>
            </div>
          </form>
        </div>
      )}

      {/* Clear History Confirmation Modal */}
      {activeModal === 'clearHistory' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">Clear Interview History?</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">This will permanently delete all your recorded practice sessions and scores.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
              <button onClick={handleClearHistory} className="flex-1 py-2.5 text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white rounded-xl">Clear All</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {activeModal === 'deleteAccount' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">Delete Account?</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">This action cannot be undone. All your personal data and documents will be removed permanently.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
              <button onClick={handleDeleteAccount} className="flex-1 py-2.5 text-xs font-extrabold bg-red-500 hover:bg-red-600 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Documentation Modal */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#5846F6]/10 text-[#5846F6] rounded-xl">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Help & Documentation</h3>
                  <p className="text-xs text-slate-400 font-medium">Find answers or contact technical support</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => alert('Redirecting to Documentation...')} className="p-4 border border-slate-200/80 hover:border-[#5846F6] rounded-2xl hover:bg-[#5846F6]/5 transition-all text-left space-y-2 group">
                <BookOpen className="w-5 h-5 text-[#5846F6]" />
                <div>
                  <div className="text-xs font-extrabold text-slate-900 group-hover:text-[#5846F6] flex items-center gap-1">User Guide <ExternalLink className="w-3 h-3" /></div>
                  <div className="text-[10px] text-slate-400 font-medium">Learn how to configure mock interviews</div>
                </div>
              </button>

              <button onClick={() => alert('Opening FAQ page...')} className="p-4 border border-slate-200/80 hover:border-[#5846F6] rounded-2xl hover:bg-[#5846F6]/5 transition-all text-left space-y-2 group">
                <FileText className="w-5 h-5 text-[#5846F6]" />
                <div>
                  <div className="text-xs font-extrabold text-slate-900 group-hover:text-[#5846F6] flex items-center gap-1">FAQs <ExternalLink className="w-3 h-3" /></div>
                  <div className="text-[10px] text-slate-400 font-medium">Common questions & scoring details</div>
                </div>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-extrabold text-slate-800">Need further assistance?</div>
                <div className="text-[11px] text-slate-400 font-medium font-sans">Support team available for query resolution</div>
              </div>
              <button onClick={() => alert('Support request submitted')} className="bg-[#5846F6] hover:bg-[#4735E5] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}