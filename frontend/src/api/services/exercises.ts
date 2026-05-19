import { api } from '@/api';
import type { ImportResult } from '@/types/admin/Admin.types';

export const exercisesApi = {
  bulkCreate: (exercises: unknown[]) => api.post<ImportResult>('/exercises/bulk', { exercises }),
};
