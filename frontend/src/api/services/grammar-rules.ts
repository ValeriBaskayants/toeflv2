import { api } from '@/api';
import type { ImportResult } from '@/types/admin/Admin.types';
import type { Level } from '@/types/globalTypes';
import type { GrammarRuleSummary, GrammarRuleDetail } from '@/types/grammar/Grammar.types';

export const grammarRulesApi = {
  bulkCreate: (grammarRules: unknown[]) =>
    api.post<ImportResult>('/grammar-rules/bulk', { rules: grammarRules }),
  getAll: (level?: Level) =>
    api.get<GrammarRuleSummary[]>('/grammar-rules', {
      params: level !== undefined ? { level } : undefined,
    }),

  getBySlug: (slug: string) => api.get<GrammarRuleDetail>(`/grammar-rules/${slug}`),
};
