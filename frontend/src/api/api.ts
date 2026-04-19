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

// ─── Refresh queue ────────────────────────────────────────────────────────────
//
// Problem: 3 concurrent requests all get 401 at the same time.
// Without a queue: 3 separate /auth/refresh calls → rotation breaks session 2 & 3.
//
// Solution: only ONE refresh runs at a time. All other 401s queue up and wait.
// Success → all queued requests resume with the new token.
// Failure → all queued requests reject, session is cleared.

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

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  // CRITICAL: sends the HttpOnly refresh token cookie on cross-origin requests
  // (frontend :5173 → backend :3001). Without this, refresh token is never sent.
  withCredentials: true,
});

// ─── Request interceptor: inject access token ─────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Read from Redux store directly — React hooks can't be used outside components
  const { accessToken } = store.getState().auth;

  if (accessToken !== null) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// ─── Response interceptor: 401 → refresh → retry ─────────────────────────────

api.interceptors.response.use(
  (response) => response,

  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableConfig | undefined;

    // Not a 401, no config, or already retried — don't handle
    if (
      error.response?.status !== 401 ||
      originalRequest === undefined ||
      originalRequest._retry === true
    ) {
      return Promise.reject(error);
    }

    // Another refresh is already running — queue this request
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

    // ── Start refresh ──
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Use plain axios (NOT the `api` instance) to avoid triggering this
      // same interceptor recursively if refresh itself returns 401
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
      // Hard redirect so Router resets cleanly and all in-memory state is gone
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Typed API helpers ────────────────────────────────────────────────────────
// All API calls go through here — no raw axios calls in components

export const authApi = {
  getMe: () => api.get<User>('/auth/me'),
};