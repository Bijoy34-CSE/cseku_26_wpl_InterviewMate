import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar';
import FileTypeIcon from '../FileTypeIcon';
import { useUser } from '../../context/UserContext';
import { listInterviewSessions } from '../../api';
import { 
  Building2, 
  GraduationCap, 
  Briefcase, 
  Mail, 
  MapPin, 
  Edit3, 
  FileText, 
  CheckCircle2, 
  Award,
  Download,
  Plus,
  Trash2,
  Upload,
  Camera,
  X
} from 'lucide-react';

export default function ProfileView() {
  const { user, setUser } = useUser();

  // Each logged-in user gets their own storage key
  const userStorageKey = user?.email ? `profile_data_${user.email}` : 'profile_data_default';

  // Profile Information State. Identity fields (name/email) always come from
  // the authenticated user; the rest are optional details the user fills in.
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    degree: user?.degree || '',
    email: user?.email || '',
    university: user?.university || '',
    department: user?.department || '',
    degreeAndYear: user?.degreeAndYear || '',
    location: user?.location || '',
    status: user?.status || 'ACTIVE',
    target: user?.target || 'TARGET: NOT SET',
    avatarUrl: user?.avatarUrl || ''
  });

  // Modal State for Editing Profile
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ ...profileData });

  // Dynamic Lists State
  const [targetRoles, setTargetRoles] = useState([]);
  const [newRoleInput, setNewRoleInput] = useState('');

  const [technicalSkills, setTechnicalSkills] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Documents uploaded directly on this page (kept per-user in localStorage)
  const [localDocuments, setLocalDocuments] = useState([]);

  // Documents this user actually attached to their interview sessions.
  // Fetched from the backend and scoped to the authenticated user by JWT.
  const [sessionDocuments, setSessionDocuments] = useState([]);

  const documents = [...sessionDocuments, ...localDocuments];

  // Load user-specific profile data from LocalStorage
  useEffect(() => {
    const savedData = localStorage.getItem(userStorageKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.profile) setProfileData(parsed.profile);
        if (parsed.roles) setTargetRoles(parsed.roles);
        if (parsed.skills) setTechnicalSkills(parsed.skills);
        if (parsed.docs) setLocalDocuments(parsed.docs);
      } catch (e) {
        console.error("Failed to load user profile", e);
      }
    }
  }, [userStorageKey]);

  // Identity always comes from the authenticated user - never from whatever
  // happens to be sitting in localStorage.
  useEffect(() => {
    if (!user) return;
    setProfileData((prev) => ({ ...prev, name: user.name || '', email: user.email || '' }));
  }, [user?.name, user?.email]);

  // Pull the documents this user attached to their own interview sessions
  useEffect(() => {
    let isMounted = true;
    listInterviewSessions()
      .then(({ data }) => {
        if (!isMounted) return;
        const seen = new Set();
        const docs = [];
        (data.sessions || []).forEach((s) => {
          if (!s.materials || seen.has(s.materials)) return;
          seen.add(s.materials);
          docs.push({
            name: s.materials,
            size: 'Interview material',
            date: s.startedAt
              ? `Added ${new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : '',
            fromSession: true,
          });
        });
        setSessionDocuments(docs);
      })
      .catch(() => {
        if (isMounted) setSessionDocuments([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Save changes to LocalStorage whenever state updates
  const saveToStorage = (updatedProfile, updatedRoles, updatedSkills, updatedDocs) => {
    const dataToSave = {
      profile: updatedProfile || profileData,
      roles: updatedRoles || targetRoles,
      skills: updatedSkills || technicalSkills,
      docs: updatedDocs || localDocuments
    };
    localStorage.setItem(userStorageKey, JSON.stringify(dataToSave));
  };

  // Handler: Change Profile Picture
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = { ...profileData, avatarUrl: reader.result };
        setProfileData(updated);
        if (setUser) setUser((prev) => ({ ...prev, avatarUrl: reader.result }));
        saveToStorage(updated, null, null, null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler: Save Modal Form Data
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileData(editFormData);
    if (setUser) setUser((prev) => ({ ...prev, ...editFormData }));
    saveToStorage(editFormData, null, null, null);
    setIsEditModalOpen(false);
  };

  // Handlers: Target Roles
  const handleAddRole = (e) => {
    e.preventDefault();
    if (newRoleInput.trim() && !targetRoles.includes(newRoleInput.trim())) {
      const updated = [...targetRoles, newRoleInput.trim()];
      setTargetRoles(updated);
      setNewRoleInput('');
      saveToStorage(null, updated, null, null);
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    const updated = targetRoles.filter(r => r !== roleToRemove);
    setTargetRoles(updated);
    saveToStorage(null, updated, null, null);
  };

  // Handlers: Skills
  const handleAddSkill = (e) => {
    e.preventDefault();
    if (newSkillInput.trim() && !technicalSkills.includes(newSkillInput.trim())) {
      const updated = [...technicalSkills, newSkillInput.trim()];
      setTechnicalSkills(updated);
      setNewSkillInput('');
      saveToStorage(null, null, updated, null);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updated = technicalSkills.filter(s => s !== skillToRemove);
    setTechnicalSkills(updated);
    saveToStorage(null, null, updated, null);
  };

  // Handlers: Documents
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const newDoc = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: `Added ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      };
      const updated = [newDoc, ...localDocuments];
      setLocalDocuments(updated);
      saveToStorage(null, null, null, updated);
    }
  };

  // Documents attached to a past interview session are part of that session's
  // record and can't be removed from here - only locally added ones can.
  const handleDeleteDoc = (doc) => {
    if (doc.fromSession) return;
    const updated = localDocuments.filter((d) => d !== doc);
    setLocalDocuments(updated);
    saveToStorage(null, null, null, updated);
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FD] font-sans text-slate-800 antialiased">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        
        {/* Top Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              User Profile
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Overview of academic background, skills, and target readiness
            </p>
          </div>

          <button 
            onClick={() => {
              setEditFormData({ ...profileData });
              setIsEditModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5846F6] hover:bg-[#4735E5] text-white text-xs font-extrabold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Profile Card Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 relative"></div>

          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
              <div className="flex items-end gap-4">
                
                {/* Profile Avatar with Direct Change Button */}
                <div className="relative group w-24 h-24 rounded-2xl border-4 border-white shadow-md bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                  {profileData.avatarUrl ? (
                    <img
                      src={profileData.avatarUrl}
                      alt={profileData.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <span className="text-2xl font-black text-slate-400">
                      {(profileData.name || '')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join('') || 'U'}
                    </span>
                  )}
                  {/* Overlay Camera Icon on Hover/Click */}
                  <label className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Change</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarChange} 
                      className="hidden" 
                    />
                  </label>
                </div>

                <div className="mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{profileData.name}</h3>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                  </div>
                  <p className="text-xs font-bold text-[#5846F6]">
                    {profileData.degree}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl">
                  ● {profileData.status}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-3 py-1.5 rounded-xl">
                  {profileData.target}
                </span>
              </div>
            </div>

            {/* Quick Meta Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{profileData.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{profileData.university}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{profileData.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Academic & Target Roles) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Academic Info */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900">
                <GraduationCap className="w-5 h-5 text-[#5846F6]" />
                <h4 className="font-extrabold text-sm">Academic Information</h4>
              </div>

              <div className="space-y-3 pt-1">
                <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    UNIVERSITY
                  </span>
                  <span className="text-xs font-black text-slate-800">{profileData.university}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    DEPARTMENT
                  </span>
                  <span className="text-xs font-black text-slate-800">{profileData.department}</span>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    DEGREE & YEAR
                  </span>
                  <span className="text-xs font-black text-slate-800">{profileData.degreeAndYear}</span>
                </div>
              </div>
            </div>

            {/* Target Roles with Add Role Input */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <Briefcase className="w-5 h-5 text-[#5846F6]" />
                  <h4 className="font-extrabold text-sm">Target Roles & Goals</h4>
                </div>
                <span className="text-[10px] font-extrabold text-[#5846F6] bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {targetRoles.length} Active
                </span>
              </div>

              {/* Add New Role Input Bar */}
              <form onSubmit={handleAddRole} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  placeholder="Add target role (e.g. Data Engineer)..."
                  className="flex-1 px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6] focus:bg-white transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#5846F6] hover:bg-[#4735E5] text-white text-xs font-extrabold rounded-xl flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Role</span>
                </button>
              </form>

              {/* Roles Badge List */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  SELECTED TARGET ROLES
                </span>
                <div className="flex flex-wrap gap-2">
                  {targetRoles.map((role, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-[#5846F6] text-xs font-extrabold rounded-xl group"
                    >
                      <span>{role}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role)}
                        className="text-indigo-400 hover:text-red-500 transition-colors ml-0.5 font-black cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Skills & Dynamic Document Upload) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Skills Section with Add Skill Input */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Award className="w-5 h-5 text-[#5846F6]" />
                <h4 className="font-extrabold text-sm">Skills & Expertise</h4>
              </div>

              {/* Add Skill Input Form */}
              <form onSubmit={handleAddSkill} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="Add skill (e.g. Node.js)..."
                  className="flex-1 px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5846F6] focus:bg-white transition-all placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>

              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  TECHNICAL SKILLS
                </span>
                <div className="flex flex-wrap gap-2">
                  {technicalSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 border border-slate-200/60 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-0.5 font-black cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Documents Section with Upload Document Area */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <FileText className="w-5 h-5 text-[#5846F6]" />
                  <h4 className="font-extrabold text-sm">Context Documents</h4>
                </div>
                <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {documents.length} Files
                </span>
              </div>

              {/* Upload Document Drag & Drop Box */}
              <label className="border-2 border-dashed border-slate-200 hover:border-[#5846F6] bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <div className="p-2.5 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-[#5846F6] transition-colors mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-extrabold text-slate-700 group-hover:text-[#5846F6]">
                  Click to Upload Document
                </span>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  PDF, DOCX or TXT (Max 10MB)
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Document List */}
              <div className="space-y-2.5 pt-1">
                {documents.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-[11px] font-bold text-slate-500">No documents yet</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Documents you upload when setting up an interview appear here.
                    </p>
                  </div>
                ) : (
                  documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <FileTypeIcon filename={doc.name} className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-800">{doc.name}</h5>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>{doc.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button className="p-2 text-slate-400 hover:text-[#5846F6] hover:bg-indigo-50 rounded-xl transition-all cursor-pointer">
                        <Download className="w-4 h-4" />
                      </button>
                      {!doc.fromSession && (
                        <button 
                          onClick={() => handleDeleteDoc(doc)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Edit Profile Details</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#5846F6]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Degree Title</label>
                <input 
                  type="text" 
                  value={editFormData.degree}
                  onChange={(e) => setEditFormData({ ...editFormData, degree: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#5846F6]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#5846F6]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Location</label>
                  <input 
                    type="text" 
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#5846F6]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">University</label>
                <input 
                  type="text" 
                  value={editFormData.university}
                  onChange={(e) => setEditFormData({ ...editFormData, university: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#5846F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Department</label>
                  <input 
                    type="text" 
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#5846F6]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Degree & Year</label>
                  <input 
                    type="text" 
                    value={editFormData.degreeAndYear}
                    onChange={(e) => setEditFormData({ ...editFormData, degreeAndYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#5846F6]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5846F6] hover:bg-[#4735E5] text-white font-extrabold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}