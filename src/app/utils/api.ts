import axios from 'axios';

// Generate a random session ID if not exists
function getSessionId() {
  if (typeof window !== 'undefined') {
    let sessionId = localStorage.getItem('gameSessionId');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2);
      localStorage.setItem('gameSessionId', sessionId);
    }
    return sessionId;
  }
  return 'default';
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'x-session-id': getSessionId(),
  },
});

export type ApiError = {
  message: string;
  status: number;
};

export async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await api.get<T>(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw {
        message: error.response?.data?.message || 'An error occurred',
        status: error.response?.status || 500,
      } as ApiError;
    }
    throw error;
  }
}

export async function mutateData<T, D>(url: string, data: D, method: 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<T> {
  try {
    const response = await api({
      method,
      url,
      data,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw {
        message: error.response?.data?.message || 'An error occurred',
        status: error.response?.status || 500,
      } as ApiError;
    }
    throw error;
  }
} 