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

const readSavedUser = (storage) => {
  try {
    const savedUser = storage.getItem('interviewmate_user_data');
    if (!savedUser) return null;
    const user = JSON.parse(savedUser);
    // Profile photos are stored by the account API. Keeping their base64 data
    // URL in browser storage can exceed the browser's per-origin quota.
    if (typeof user.avatarUrl === 'string' && user.avatarUrl.startsWith('data:image/')) {
      delete user.avatarUrl;
    }
    return user;
  } catch {
    storage.removeItem('interviewmate_user_data');
    return null;
  }
};

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
    mobile: backendUser.mobile || base.mobile || '',
    university: backendUser.university || base.university || '',
    profile: backendUser.profile || base.profile || {},
    initials: getInitials(backendUser.name),
    avatarUrl: backendUser.avatarUrl || backendUser.avatar || base.avatarUrl,
    passwordLastChanged: backendUser.passwordLastChanged || base.passwordLastChanged,
    preferences: backendUser.preferences || base.preferences || {},
    role: backendUser.role || base.role || 'user',
    provider: backendUser.provider || base.provider || 'local',
    lastLoginAt: backendUser.lastLoginAt || base.lastLoginAt || null,
    subscriptionExpiresAt: backendUser.subscriptionExpiresAt || base.subscriptionExpiresAt || null,
    freeSessionsUsed: backendUser.freeSessionsUsed ?? base.freeSessionsUsed ?? 0,
    freeUsageMonth: backendUser.freeUsageMonth || base.freeUsageMonth || '',
  };
};

const UserContext = createContext();

export function UserProvider({ children }) {
  const [rememberDevice, setRememberDevice] = useState(() => Boolean(localStorage.getItem('token')));
  const [user, setUserState] = useState(() => {
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    const hasToken = Boolean(localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (hasToken) return readSavedUser(storage);
    localStorage.removeItem('interviewmate_user_data');
    sessionStorage.removeItem('interviewmate_user_data');
    return null;
  });

  // True once we've finished checking localStorage/backend for an existing session
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Persist to localStorage whenever the user object changes
  useEffect(() => {
    if (user) {
      const storage = rememberDevice ? localStorage : sessionStorage;
      const otherStorage = rememberDevice ? sessionStorage : localStorage;
      const savedUser = { ...user };
      if (typeof savedUser.avatarUrl === 'string' && savedUser.avatarUrl.startsWith('data:image/')) {
        delete savedUser.avatarUrl;
      }
      try {
        storage.setItem('interviewmate_user_data', JSON.stringify(savedUser));
        otherStorage.removeItem('interviewmate_user_data');
      } catch (error) {
        console.error('[auth] could not persist account data in browser storage:', error);
      }
    }
  }, [rememberDevice, user]);

  // On first load, verify any existing token against the backend so a page
  // refresh keeps the user logged in (and logs them out if the token is
  // no longer valid/expired).
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
      setAuthLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await getCurrentUser();
        const remember = Boolean(localStorage.getItem('token'));
        const storage = remember ? localStorage : sessionStorage;
        const savedUser = readSavedUser(storage);
        const merged = buildProfile(data.user, savedUser);
        setRememberDevice(remember);
        setUserState(merged);
        setIsAuthenticated(true);
      } catch (error) {
        // Token invalid/expired - clear the stale session
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        localStorage.removeItem('interviewmate_user_data');
        setUserState(null);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // Call this right after a successful /login or /register API response
  const login = (backendUser, token, rememberMe = true) => {
    const savedUser = readSavedUser(localStorage) || readSavedUser(sessionStorage);
    const merged = buildProfile(backendUser, savedUser);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    (rememberMe ? localStorage : sessionStorage).setItem('token', token);
    setRememberDevice(rememberMe);
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    storage.setItem('interviewmate_user_data', JSON.stringify(merged));
    otherStorage.removeItem('interviewmate_user_data');
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
    sessionStorage.removeItem('token');
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
