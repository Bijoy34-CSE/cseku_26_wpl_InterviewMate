import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logoutUser } from '../api';

// Optional profile fields the user can fill in themselves. These start empty
// - identity (id/name/email) always comes from the backend, and nothing here
// is ever pre-populated with another person's details.
const profileDefaults = {
  initials: '',
  degree: '',
  university: '',
  location: '',
  department: '',
  degreeAndYear: '',
  status: '',
  target: '',
  avatarUrl: '',
  passwordLastChanged: '',
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

const buildProfile = (backendUser, previouslySaved) => {
  // Only carry over saved optional fields if they belong to THIS account -
  // otherwise a previous user's details could bleed into a new login.
  const sameUser =
    previouslySaved &&
    (String(previouslySaved.id || '') === String(backendUser.id || backendUser._id || '') ||
      previouslySaved.email === backendUser.email);

  const base = { ...profileDefaults, ...(sameUser ? previouslySaved : {}) };
  return {
    ...base,
    id: backendUser.id || backendUser._id,
    name: backendUser.name,
    email: backendUser.email,
    initials: getInitials(backendUser.name),
  };
};

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUserState] = useState(() => {
    const savedUser = localStorage.getItem('interviewmate_user_data');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // True once we've finished checking localStorage/backend for an existing session
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Persist to localStorage whenever the user object changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('interviewmate_user_data', JSON.stringify(user));
    }
  }, [user]);

  // On first load, verify any existing token against the backend so a page
  // refresh keeps the user logged in (and logs them out if the token is
  // no longer valid/expired).
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setAuthLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await getCurrentUser();
        const savedUser = localStorage.getItem('interviewmate_user_data');
        const merged = buildProfile(data.user, savedUser ? JSON.parse(savedUser) : null);
        setUserState(merged);
        setIsAuthenticated(true);
      } catch (error) {
        // Token invalid/expired - clear the stale session
        localStorage.removeItem('token');
        localStorage.removeItem('interviewmate_user_data');
        setUserState(null);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // Call this right after a successful /login or /register API response
  const login = (backendUser, token) => {
    const savedUser = localStorage.getItem('interviewmate_user_data');
    const merged = buildProfile(backendUser, savedUser ? JSON.parse(savedUser) : null);
    localStorage.setItem('token', token);
    localStorage.setItem('interviewmate_user_data', JSON.stringify(merged));
    setUserState(merged);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      // Ignore network/auth errors on logout - we clear local state regardless
    }
    localStorage.removeItem('token');
    localStorage.removeItem('interviewmate_user_data');
    setUserState(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedFields) => {
    setUserState((prev) => ({ ...prev, ...updatedFields }));
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser: setUserState,
        updateUser,
        login,
        logout,
        isAuthenticated,
        authLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
