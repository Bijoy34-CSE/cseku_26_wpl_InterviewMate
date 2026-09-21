import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Attach the JWT (if present) to every outgoing request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = (formData) => API.post('/auth/login', formData);
export const registerUser = (formData) => API.post('/auth/register', formData);
export const verifyOtp = (payload) => API.post('/auth/verify-otp', payload);
export const resendOtp = (payload) => API.post('/auth/resend-otp', payload);
export const getAuthConfig = () => API.get('/auth/config');

// OAuth is a full-page browser redirect (not XHR) so the provider can render
// its consent screen; the backend holds the client secret and issues our token.
export const API_ORIGIN = 'http://localhost:5000';
export const startOAuth = (provider) => {
  window.location.href = `${API_ORIGIN}/api/auth/${provider}`;
};
export const getCurrentUser = () => API.get('/auth/me');
export const logoutUser = () => API.post('/auth/logout');

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
    return API.post('/interview/sessions', payload);
  }
  return API.post('/interview/sessions', formData);
};
export const getInterviewSession = (sessionId) => API.get(`/interview/sessions/${sessionId}`);
export const listInterviewSessions = () => API.get('/interview/sessions');
export const submitInterviewAnswer = (sessionId, payload) =>
  API.post(`/interview/sessions/${sessionId}/answers`, payload);
export const completeInterviewSession = (sessionId) =>
  API.post(`/interview/sessions/${sessionId}/complete`);
export const timeoutInterviewSession = (sessionId) =>
  API.post(`/interview/sessions/${sessionId}/timeout`);
export const getSessionFeedback = (sessionId) => API.get(`/feedback/${sessionId}`);

// Site feedback (bug reports / feature requests / general comments)
export const submitSiteFeedback = (payload) => API.post('/site-feedback', payload);
export const getMyFeedback = () => API.get('/site-feedback');
