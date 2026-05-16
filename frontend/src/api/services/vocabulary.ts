import { api } from '@/api';
import type { ImportResult } from '@/types/admin/Admin.types';

export const vocabularyApi = {
  bulkCreate: (vocabulary: unknown[]) =>
    api.post<ImportResult>('/vocabulary/bulk', { vocabulary }),
};
