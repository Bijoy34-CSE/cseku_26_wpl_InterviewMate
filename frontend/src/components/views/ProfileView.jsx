import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../Sidebar';
import FileTypeIcon from '../FileTypeIcon';
import { useUser } from '../../context/UserContext';
import { deleteInterviewSession, listInterviewSessions, updateAccountAvatar, updateAccountProfile } from '../../api';
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
  Plus,
  Trash2,
  Camera,
  X
} from 'lucide-react';

export default function ProfileView() {
  const { user, setUser } = useUser();
  const avatarInputRef = useRef(null);
  const optionalProfile = user?.profile || {};
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    degree: optionalProfile.degree || '',
    email: user?.email || '',
    university: user?.university || '',
    department: optionalProfile.department || '',
    degreeAndYear: optionalProfile.degreeAndYear || '',
    location: optionalProfile.location || '',
    status: optionalProfile.status || 'ACTIVE',
    target: optionalProfile.target || 'TARGET: NOT SET',
    avatarUrl: user?.avatarUrl || ''
  });

  // Modal State for Editing Profile
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ ...profileData });

  // Dynamic Lists State
  const [targetRoles, setTargetRoles] = useState(optionalProfile.targetRoles || []);
  const [newRoleInput, setNewRoleInput] = useState('');

  const [technicalSkills, setTechnicalSkills] = useState(optionalProfile.technicalSkills || []);
  const [newSkillInput, setNewSkillInput] = useState('');

  const [sessionDocuments, setSessionDocuments] = useState([]);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    const profile = user.profile || {};
    setProfileData((previous) => ({
      ...previous,
      name: user.name || '',
      email: user.email || '',
      university: user.university || '',
      degree: profile.degree || '',
      department: profile.department || '',
      degreeAndYear: profile.degreeAndYear || '',
      location: profile.location || '',
      status: profile.status || 'ACTIVE',
      target: profile.target || 'TARGET: NOT SET',
      avatarUrl: user.avatarUrl || previous.avatarUrl,
    }));
    setTargetRoles(profile.targetRoles || []);
    setTechnicalSkills(profile.technicalSkills || []);
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    listInterviewSessions()
      .then(({ data }) => {
        if (!isMounted) return;
        const docs = [];
        (data.sessions || []).forEach((s) => {
          if (!s.materials) return;
          docs.push({
            id: s.id,
            name: s.materials,
            size: 'Interview session document',
            date: s.startedAt
              ? `Added ${new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : '',
            fromSession: true,
          });
        });
        setSessionDocuments(docs);
      })
      .catch((error) => {
        if (isMounted) setProfileError(error.response?.data?.message || 'Could not load your interview documents.');
      });
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleAvatarChange = async (e) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setProfileError('Choose a PNG, JPG, or WebP profile image.');
      return;
    }
    if (file && file.size > 2 * 1024 * 1024) {
      setProfileError('Profile images must be 2MB or smaller.');
      return;
    }

    setProfileError('');
    setProfileNotice('');
    setUploadingAvatar(true);
    try {
      const { data } = await updateAccountAvatar(file);
      setProfileData((previous) => ({ ...previous, avatarUrl: data.user.avatarUrl }));
      setUser((previous) => ({ ...previous, avatarUrl: data.user.avatarUrl }));
      setProfileNotice('Profile photo saved to your account.');
    } catch (error) {
      setProfileError(error.response?.data?.message || error.message || 'Could not save profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const persistProfile = async (profile) => {
    setProfileError('');
    setProfileNotice('');
    const { data } = await updateAccountProfile({ profile });
    setUser((previous) => ({
      ...previous,
      name: data.user.name,
      university: data.user.university,
      profile: data.user.profile,
    }));
    setProfileData((previous) => ({
      ...previous,
      name: data.user.name,
      university: data.user.university,
      ...data.user.profile,
    }));
    setTargetRoles(data.user.profile.targetRoles || []);
    setTechnicalSkills(data.user.profile.technicalSkills || []);
    return data.user;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const profile = {
        degree: editFormData.degree,
        department: editFormData.department,
        degreeAndYear: editFormData.degreeAndYear,
        location: editFormData.location,
        status: editFormData.status,
        target: editFormData.target,
      };
      const { data } = await updateAccountProfile({
        name: editFormData.name,
        university: editFormData.university,
        profile,
      });
      setProfileData((previous) => ({
        ...previous,
        name: data.user.name,
        university: data.user.university,
        ...data.user.profile,
      }));
      setUser((previous) => ({
        ...previous,
        name: data.user.name,
        university: data.user.university,
        profile: data.user.profile,
      }));
      setIsEditModalOpen(false);
      setProfileNotice('Profile saved to your account.');
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (newRoleInput.trim() && !targetRoles.includes(newRoleInput.trim())) {
      const updated = [...targetRoles, newRoleInput.trim()];
      try {
        await persistProfile({ targetRoles: updated });
        setNewRoleInput('');
        setProfileNotice('Target role saved.');
      } catch (error) {
        setProfileError(error.response?.data?.message || 'Could not add target role.');
      }
    }
  };

  const handleRemoveRole = async (roleToRemove) => {
    const updated = targetRoles.filter(r => r !== roleToRemove);
    try {
      await persistProfile({ targetRoles: updated });
      setProfileNotice('Target role removed.');
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Could not remove target role.');
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (newSkillInput.trim() && !technicalSkills.includes(newSkillInput.trim())) {
      const updated = [...technicalSkills, newSkillInput.trim()];
      try {
        await persistProfile({ technicalSkills: updated });
        setNewSkillInput('');
        setProfileNotice('Skill saved.');
      } catch (error) {
        setProfileError(error.response?.data?.message || 'Could not add skill.');
      }
    }
  };

  const handleRemoveSkill = async (skillToRemove) => {
    const updated = technicalSkills.filter(s => s !== skillToRemove);
    try {
      await persistProfile({ technicalSkills: updated });
      setProfileNotice('Skill removed.');
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Could not remove skill.');
    }
  };

  const handleDeleteDoc = async (doc) => {
    if (!doc.id || !window.confirm(`Delete the interview session and its stored results for "${doc.name}"?`)) return;
    try {
      await deleteInterviewSession(doc.id);
      setSessionDocuments((documents) => documents.filter((item) => item.id !== doc.id));
      setProfileNotice('Interview session and stored document context deleted.');
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Could not delete this interview session.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F7F8FF] via-[#F0EEFF] to-[#F5FAFF] font-sans text-slate-800 antialiased">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        {profileError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{profileError}</p>}
        {profileNotice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{profileNotice}</p>}
        
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
            type="button"
            onClick={() => {
              setEditFormData({ ...profileData });
              setProfileError('');
              setIsEditModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] hover:brightness-110 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
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
                
                {/* Profile Avatar with a touch-friendly photo action */}
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
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    aria-label="Change profile photo"
                    title="Change profile photo"
                    className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] text-white shadow-md transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                    aria-label="Select profile photo"
                  />
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
                  className="px-3 py-2 bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] hover:brightness-110 text-black text-xs font-extrabold rounded-xl flex items-center gap-1 transition-all shrink-0 cursor-pointer"
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
                  className="px-3 py-2 bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] hover:brightness-110 text-black text-xs font-extrabold rounded-xl flex items-center gap-1 transition-all shrink-0 cursor-pointer"
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

            {/* Documents attached to completed or active interview sessions */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <FileText className="w-5 h-5 text-[#5846F6]" />
                  <h4 className="font-extrabold text-sm">Context Documents</h4>
                </div>
                <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {sessionDocuments.length} Files
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-500">Only extracted context from your real interview sessions is stored. Upload a new document from Set Up Interview. Original uploaded files are not retained.</p>
              <div className="space-y-2.5 pt-1">
                {sessionDocuments.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-[11px] font-bold text-slate-500">No documents yet</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Documents you upload when setting up an interview appear here.
                    </p>
                  </div>
                ) : (
                  sessionDocuments.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
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
                      {doc.id && (
                        <button 
                          onClick={() => handleDeleteDoc(doc)}
                          aria-label={`Delete interview session for ${doc.name}`}
                          title="Delete interview session and results"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="edit-profile-title" className="text-base font-extrabold text-slate-900">Edit Profile Details</h3>
              <button 
                type="button"
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
                    value={user?.email || ''}
                    disabled
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Current Status</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#5846F6]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Career Target</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={editFormData.target}
                    onChange={(e) => setEditFormData({ ...editFormData, target: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#5846F6]"
                  />
                </div>
              </div>

              {profileError && <p role="alert" className="text-xs font-semibold text-rose-600">{profileError}</p>}

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
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-br from-[#2438d5] via-[#1928c3] to-[#1724b1] hover:brightness-110 text-white font-extrabold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}