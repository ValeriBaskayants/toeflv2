import { api } from '@/api';
import type { ImportResult } from '@/types/admin/Admin.types';

export const writingApi = {
  bulkCreatePrompts: (writingPrompts: unknown[]) =>
    api.post<ImportResult>('/writing/prompts/bulk', { prompts: writingPrompts }),
};
