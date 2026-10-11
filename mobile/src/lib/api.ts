
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const configuredOrigin = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const defaultOrigin =
  Platform.OS === 'android'
    ? Device.isDevice && expoHost
      ? `http://${expoHost}:5000`
      : 'http://10.0.2.2:5000'
    : Platform.OS === 'web'
      ? 'http://localhost:5000'
      : expoHost
        ? `http://${expoHost}:5000`
        : 'http://localhost:5000';

export const API_BASE_URL = `${(configuredOrigin || defaultOrigin).replace(/\/api$/i, '')}/api`;

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string;
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
      {
        method: options.method ?? 'GET',
        headers,
        credentials: 'omit',
        body:
          options.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
      },
    );
  } catch {
    throw new Error(
      `Cannot connect to InterviewMate API at ${API_BASE_URL}. Check that the backend is running and the URL is correct.`,
    );
  }

  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Invalid server response.' };
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : `Request failed (${response.status}).`;

    throw new Error(message);
  }

  return data as T;
}

export type InterviewSession = {
  id: string;
  purpose: string;
  difficulty: string;
  level: string;
  durationLabel: string;
  durationMinutes: number;
  deadlineAt?: string | null;
  mode: string;
  materials?: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  status: 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  timedOut?: boolean;
  overallScore?: number | null;
  categoryScores?: Record<string, number> | null;
};

export type InterviewQuestion = {
  id: string;
  index: number;
  text: string;
  difficulty: string;
};

export type InterviewFeedback = {
  overallScore?: number;
  overallPercentage?: number;
  assessment?: string;
  strengths?: string[];
  improvements?: string[];
  answeredQuestions?: number;
  missedQuestions?: number;
};

export type DocumentUpload = {
  uri: string;
  name: string;
  mimeType: string;
};

export type PracticeQuestion = {
  _id: string;
  question: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
};

export type PracticeEvaluation = {
  overall: number;
  technicalAccuracy: number;
  structuralFlow: number;
  communication: number;
  relevance: number;
  completeness?: number | null;
  aiFeedback: string;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  suggestedAnswer: string;
};

export function listPracticeQuestions(
  token: string,
): Promise<{ questions: PracticeQuestion[] }> {
  return apiRequest('/auth/practice-questions', { token });
}

export function evaluatePracticeAnswer(
  token: string,
  payload: {
    question: string;
    answer: string;
    topic: string;
    difficulty: PracticeQuestion['difficulty'];
  },
): Promise<{ result: PracticeEvaluation }> {
  return apiRequest('/interview/practice/evaluate', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function uploadProfileAvatar(
  token: string,
  file: DocumentUpload,
): Promise<{ user: import('./auth').AuthUser }> {
  const form = new FormData();
  form.append('avatar', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new Error(
      `Cannot connect to InterviewMate API at ${API_BASE_URL}. Check that the backend is running and the URL is reachable from this device.`,
    );
  }
  return parseResponse(response);
}

export async function createInterviewSession(
  token: string,
  setup: {
    purpose: string;
    difficulty: string;
    level: string;
    duration: string;
    questions: string;
    mode: string;
    adaptiveDifficulty: boolean;
  },
  file: DocumentUpload,
): Promise<{
  session: InterviewSession;
  question: InterviewQuestion;
}> {
  const form = new FormData();
  Object.entries(setup).forEach(([key, value]) => form.append(key, String(value)));
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/interview/sessions`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new Error(
      `Cannot connect to InterviewMate API at ${API_BASE_URL}. Check that the backend is running and the URL is reachable from this device.`,
    );
  }
  return parseResponse(response);
}

export async function listInterviewSessions(
  token: string,
): Promise<{ sessions: InterviewSession[] }> {
  return apiRequest('/interview/sessions', { token });
}

export async function getInterviewSession(
  token: string,
  sessionId: string,
): Promise<{
  session: InterviewSession;
  currentQuestion: InterviewQuestion | null;
  pendingAnswer: string | null;
}> {
  return apiRequest(`/interview/sessions/${sessionId}`, { token });
}

export async function submitInterviewAnswer(
  token: string,
  sessionId: string,
  questionId: string,
  text: string,
): Promise<{
  completed: boolean;
  session: InterviewSession;
  nextQuestion?: InterviewQuestion;
  feedback?: InterviewFeedback;
}> {
  return apiRequest(`/interview/sessions/${sessionId}/answers`, {
    method: 'POST',
    token,
    body: { questionId, text },
  });
}

export async function skipInterviewQuestion(
  token: string,
  sessionId: string,
): Promise<{
  completed: boolean;
  session: InterviewSession;
  nextQuestion?: InterviewQuestion;
  feedback?: InterviewFeedback;
}> {
  return apiRequest(`/interview/sessions/${sessionId}/skip`, {
    method: 'POST',
    token,
    body: {},
  });
}

export async function completeInterviewSession(
  token: string,
  sessionId: string,
): Promise<{ session: InterviewSession; feedback: InterviewFeedback }> {
  return apiRequest(`/interview/sessions/${sessionId}/complete`, {
    method: 'POST',
    token,
    body: {},
  });
}

export async function timeoutInterviewSession(
  token: string,
  sessionId: string,
): Promise<{ session: InterviewSession; feedback: InterviewFeedback }> {
  return apiRequest(`/interview/sessions/${sessionId}/timeout`, {
    method: 'POST',
    token,
    body: {},
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Invalid server response.' };
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return data as T;
}