import { api } from '@/api';
import type { AdminStats } from '@/types/admin/Admin.types';

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),
};