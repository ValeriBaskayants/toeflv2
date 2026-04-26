import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { store } from '@/store/store';
import { setAccessToken, clearAuth } from '@/store/Slices/AuthSlice';
import type { RefreshResponse, User } from '@/types/auth/Auth.types';

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] as string;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface PendingRequest {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}


let isRefreshing = false;
let pendingQueue: PendingRequest[] = [];

function processQueue(error: unknown, newToken: string | null): void {
  for (const pending of pendingQueue) {
    if (error !== null) {
      pending.reject(error);
    } else if (newToken !== null) {
      pending.resolve(newToken);
    }
  }
  pendingQueue = [];
}


export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});


api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = store.getState().auth;

  if (accessToken !== null) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});


api.interceptors.response.use(
  (response) => response,

  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableConfig | undefined;

    if (
      error.response?.status !== 401 ||
      originalRequest === undefined ||
      originalRequest._retry === true
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((queueError: unknown) => Promise.reject(queueError));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<RefreshResponse>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const { accessToken: newToken } = data;

      store.dispatch(setAccessToken(newToken));
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      store.dispatch(clearAuth());
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);


export const authApi = {
  getMe: () => api.get<User>('/auth/me'),
};