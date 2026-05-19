import type { User, RefreshResponse } from '@/types/auth/Auth.types';
import { api } from './../client';

export const authApi = {
  getMe: () => api.get<User>('/auth/me'),

  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: User }>('/auth/login', { email, password }),

  logout: () => api.post<void>('/auth/logout'),

  register: (name: string, email: string, password: string) =>
    api.post<{ accessToken: string; user: User }>('/auth/register', { name, email, password }),
};

export type { RefreshResponse };
