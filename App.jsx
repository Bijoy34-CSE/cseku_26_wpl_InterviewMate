import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import User Provider Context
import { UserProvider } from './context/UserContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import all view components
import CareerAcademic from './components/views/CareerAcademic';
import Dashboard from './components/views/Dashboard';
import FeedbackResults from './components/views/FeedbackResults';
import InterviewCompleted from './components/views/InterviewCompleted';
import LandingPage from './components/views/LandingPage';
import Login from './components/views/Login';
import MockInterview from './components/views/MockInterview';
import PerformanceAnalytics from './components/views/PerformanceAnalytics';
import PracticeQuestions from './components/views/PracticeQuestions';
import ProfileView from './components/views/ProfileView';
import SettingsView from './components/views/SettingsView';
import Signup from './components/views/Signup';
import VerifyEmail from './components/views/VerifyEmail';
import OAuthCallback from './components/views/OAuthCallback';
import StartInterview from './components/views/StartInterview';
import Community from './components/views/Community';
import Help from './components/views/Help';
import Feedback from './components/views/Feedback';

export default function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          {/* Dashboard & Main Features (require login) */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/start-interview" element={<ProtectedRoute><StartInterview /></ProtectedRoute>} />
          <Route path="/mock-interviews" element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
          <Route path="/interview-completed" element={<ProtectedRoute><InterviewCompleted /></ProtectedRoute>} />
          <Route path="/feedback-results" element={<ProtectedRoute><FeedbackResults /></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute><PracticeQuestions /></ProtectedRoute>} />
          <Route path="/performance" element={<ProtectedRoute><PerformanceAnalytics /></ProtectedRoute>} />
          <Route path="/career" element={<ProtectedRoute><CareerAcademic /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}