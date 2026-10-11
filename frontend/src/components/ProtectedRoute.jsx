import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

// Wrap any route element with this to require a logged-in user.
// While we're still verifying an existing token against the backend
// (authLoading), we render nothing rather than redirecting, so a page
// refresh doesn't briefly bounce a logged-in user to /login.
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, authLoading } = useUser();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
