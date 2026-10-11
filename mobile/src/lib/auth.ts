import * as SecureStore from 'expo-secure-store';
import { apiRequest } from './api';

const TOKEN_KEY = 'interviewmate_auth_token';

export type AuthUser = {
  _id?: string;
  id?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name?: string;
  email: string;
  university?: string;
  college?: string;
  [key: string]: unknown;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type MeResponse = {
  user: AuthUser;
};

export async function login(
  email: string,
  password: string,
  rememberMe = true,
): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password, rememberMe },
  });

  if (!result.token || !result.user) {
    throw new Error('The server returned an invalid login response.');
  }

  await SecureStore.setItemAsync(TOKEN_KEY, result.token);
  return result;
}

export async function registerAccount(payload: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<void> {
  await apiRequest('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function verifyRegistrationOtp(
  email: string,
  otp: string,
): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>('/auth/verify-otp', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), otp: otp.trim() },
  });
  if (!result.token || !result.user) {
    throw new Error('The server returned an invalid verification response.');
  }
  await SecureStore.setItemAsync(TOKEN_KEY, result.token);
  return result;
}

export async function resendRegistrationOtp(email: string): Promise<void> {
  await apiRequest('/auth/resend-otp', {
    method: 'POST',
    body: { email: email.trim().toLowerCase() },
  });
}

export async function getSavedToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = await getSavedToken();

  if (!token) {
    throw new Error('Please sign in to continue.');
  }

  try {
    const result = await apiRequest<MeResponse>('/auth/me', { token });
    return result.user;
  } catch (error) {
    if (error instanceof Error &&
        /unauthorized|invalid token|token expired/i.test(error.message)) {
      await logout();
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  const token = await getSavedToken();

  try {
    if (token) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        token,
      });
    }
  } finally {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
