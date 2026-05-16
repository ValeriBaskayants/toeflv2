import { api } from '@/api';
import type { ImportResult } from '@/types/admin/Admin.types';

export const listeningApi = {
  bulkCreate: (listening: unknown[]) =>
    api.post<ImportResult>('/listening/bulk', { items: listening }),
};
