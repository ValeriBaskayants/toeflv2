import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { store } from '@/store/store';
import { setAccessToken, clearAuth } from '@/store/Slices/AuthSlice';
import type { RefreshResponse } from '@/types/auth/Auth.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RetryableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

interface PendingRequest {
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}

// ─── Token-refresh state ──────────────────────────────────────────────────────
// Shared across all interceptor invocations — must live at module scope.

let isRefreshing = false;
let pendingQueue: PendingRequest[] = [];

function processQueue(error: unknown, newToken: string | null): void {
    for (const pending of pendingQueue) {
        error !== null ? pending.reject(error) : pending.resolve(newToken!);
    }
    pendingQueue = [];
}

// ─── Instance ─────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env['VITE_API_BASE_URL'] as string;

export const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // sends HttpOnly refresh-token cookie on every request
});

// ─── Request interceptor: attach access token ─────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { accessToken } = store.getState().auth;
    if (accessToken !== null) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

// ─── Response interceptor: silent token refresh on 401 ───────────────────────
// Uses raw axios (not `api`) for the refresh call to avoid an interceptor loop.

api.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        if (!axios.isAxiosError(error)) return Promise.reject(error);

        const originalRequest = error.config as RetryableConfig | undefined;

        // Only handle 401s that haven't been retried yet
        if (
            error.response?.status !== 401 ||
            originalRequest === undefined ||
            originalRequest._retry === true
        ) {
            return Promise.reject(error);
        }

        // Another refresh is already in flight — queue this request until it resolves
        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                pendingQueue.push({ resolve, reject });
            }).then((newToken) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const { data } = await axios.post<RefreshResponse>(
                `${BASE_URL}/auth/refresh`,
                {},
                { withCredentials: true },
            );

            store.dispatch(setAccessToken(data.accessToken));
            processQueue(null, data.accessToken);

            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
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