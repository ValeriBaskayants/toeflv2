import { api } from '../client';
import type {
  ReadingMaterial,
  SubmitReadingPayload,
  SubmitReadingResult,
} from '@/types/reading/Reading.types';
import type { ImportResult } from '@/types/admin/Admin.types';

export const readingsApi = {
  getList: (params: { level?: string; topic?: string }) =>
    api.get<ReadingMaterial[]>('/readings', { params }),

  getBySlug: (slug: string) => api.get<ReadingMaterial>(`/readings/slug/${slug}`),

  getById: (id: string) => api.get<ReadingMaterial>(`/readings/${id}`),

  submit: (payload: SubmitReadingPayload) =>
    api.post<SubmitReadingResult>('/readings/submit', payload),

  bulkCreate: (readings: unknown[]) => api.post<ImportResult>('/readings/bulk', { readings }),
};
