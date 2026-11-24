import { api } from '@/api';
import type { AdminStats, ImportResult } from '@/types/admin/Admin.types';

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),

  bulkSpeakingRepeat: (sets: unknown[]) => api.post<ImportResult>('/speaking-repeat/bulk', { sets }),
  bulkSpeakingInterview: (sets: unknown[]) => api.post<ImportResult>('/speaking-interview/bulk', { sets }),
};