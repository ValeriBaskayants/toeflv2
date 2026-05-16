import { api } from '@/api';
import type { ImportResult } from '@/types/admin/Admin.types';

export const grammarRulesApi = {
  bulkCreate: (grammarRules: unknown[]) =>
    api.post<ImportResult>('/grammar-rules/bulk', { rules: grammarRules }),
};
