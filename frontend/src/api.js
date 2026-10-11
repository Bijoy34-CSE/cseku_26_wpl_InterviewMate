import axios from 'axios';

// Where the backend lives.
//  - Set VITE_API_ORIGIN (e.g. https://api.example.com) when building for
//    production, desktop (Electron) or mobile (Capacitor) - those builds are NOT
//    served from the API's own domain.
//  - In `npm run dev` it falls back to the local backend on port 5000.
//  - In a production web build with no VITE_API_ORIGIN, it assumes the API is
//    served from the same origin as the site (e.g. behind a reverse proxy).
const configuredOrigin = String(import.meta.env.VITE_API_ORIGIN || '').trim().replace(/\/+$/, '');
export const API_ORIGIN =
  configuredOrigin ||
  (import.meta.env.DEV
    ? 'http://localhost:5000'
    : (typeof window !== 'undefined' ? window.location.origin : ''));

const API = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

// Attach the JWT (if present) to every outgoing request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = (formData) => API.post('/auth/login', formData);
export const registerUser = (formData) => API.post('/auth/register', formData);
export const verifyOtp = (payload) => API.post('/auth/verify-otp', payload);
export const resendOtp = (payload) => API.post('/auth/resend-otp', payload);
export const requestPasswordReset = (email) => API.post('/auth/password-reset/request', { email });
export const verifyPasswordResetCode = (payload) => API.post('/auth/password-reset/verify', payload);
export const resetPassword = (payload) => API.post('/auth/password-reset/confirm', payload);
export const getAuthConfig = () => API.get('/auth/config');

// OAuth is a full-page browser redirect (not XHR) so the provider can render
// its consent screen; the backend holds the client secret and issues our token.
export const startOAuth = (provider, selectedPlan) => {
  if (selectedPlan === 'monthly' || selectedPlan === 'yearly') {
    sessionStorage.setItem('interviewmate_checkout_plan', selectedPlan);
  } else {
    sessionStorage.removeItem('interviewmate_checkout_plan');
  }
  window.location.href = `${API_ORIGIN}/api/auth/${provider}`;
};
export const getCurrentUser = () => API.get('/auth/me');
export const logoutUser = () => API.post('/auth/logout');
export const getAccountSettings = () => API.get('/auth/account');
export const updateAccountPreferences = (preferences) => API.patch('/auth/preferences', { preferences });
export const updateAccountProfile = (payload) => API.patch('/auth/profile', payload);
export const updateAccountAvatar = (file) => {
  const payload = new FormData();
  payload.append('avatar', file);
  return API.patch('/auth/profile/avatar', payload);
};
export const requestEmailChange = (email) => API.post('/auth/email-change', { email });
export const confirmEmailChange = (code) => API.post('/auth/email-change/confirm', { code });
export const changeAccountPassword = (payload) => API.put('/auth/password', payload);
export const clearInterviewHistory = () => API.delete('/auth/history');
export const deleteAccount = (payload) => API.delete('/auth/account', { data: payload });
export const getPlanStatus = () => API.get('/auth/plan');
export const submitPaymentReference = (payload) => API.post('/auth/payments', payload);
export const getAdminOverview = () => API.get('/admin/overview');
export const getAdminUsers = (params) => API.get('/admin/users', { params });
export const updateAdminUserAccess = (id, payload) => API.patch(`/admin/users/${id}/access`, payload);
export const getAdminSessions = () => API.get('/admin/sessions');
export const getAdminQuestions = () => API.get('/admin/questions');
export const addAdminQuestion = (payload) => API.post('/admin/questions', payload);
export const updateAdminQuestion = (id, payload) => API.patch(`/admin/questions/${id}`, payload);
export const getAdminFeedback = () => API.get('/admin/feedback');
export const getAdminPayments = () => API.get('/admin/payments');
export const reviewAdminPayment = (id, payload) => API.patch(`/admin/payments/${id}`, payload);
export const getCuratedPracticeQuestions = () => API.get('/auth/practice-questions');

// Interview session flow
// When a file is attached, send multipart/form-data so the backend can
// extract its text; otherwise send plain JSON exactly as before.
export const createInterviewSession = (formData, file) => {
  if (file) {
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) payload.append(key, value);
    });
    payload.append('file', file);
    return API.post('/interview/sessions', payload, { timeout: 180000 });
  }
  return API.post('/interview/sessions', formData, { timeout: 180000 });
};
export const getInterviewSession = (sessionId) => API.get(`/interview/sessions/${sessionId}`);
export const listInterviewSessions = () => API.get('/interview/sessions');
export const deleteInterviewSession = (sessionId) => API.delete(`/interview/sessions/${sessionId}`);
// Evaluation + adaptive next question can take a while; retrying is safe because
// the server resumes where it stopped.
export const submitInterviewAnswer = (sessionId, payload) =>
  API.post(`/interview/sessions/${sessionId}/answers`, payload, { timeout: 180000 });
export const skipInterviewQuestion = (sessionId) =>
  API.post(`/interview/sessions/${sessionId}/skip`, {}, { timeout: 180000 });
export const completeInterviewSession = (sessionId) =>
  API.post(`/interview/sessions/${sessionId}/complete`);
export const timeoutInterviewSession = (sessionId) =>
  API.post(`/interview/sessions/${sessionId}/timeout`);
export const getSessionFeedback = (sessionId) => API.get(`/feedback/${sessionId}`);

// Practice Again - re-attempt a single question from a completed interview,
// scored through the same Gemini flow as the original interview.
export const practiceAgainQuestion = (sessionId, questionId, text) =>
  API.post(`/interview/sessions/${sessionId}/questions/${questionId}/practice-again`, { text }, { timeout: 180000 });
export const listPracticeAttempts = (sessionId, questionId) =>
  API.get(`/interview/sessions/${sessionId}/questions/${questionId}/practice-attempts`);
export const evaluatePracticeAnswer = (payload) =>
  API.post('/interview/practice/evaluate', payload, { timeout: 180000 });

// Site feedback (bug reports / feature requests / general comments)
export const submitSiteFeedback = (payload) => API.post('/site-feedback', payload);
export const getMyFeedback = () => API.get('/site-feedback');
