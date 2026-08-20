import { api } from '@/api/client';
import type { ImportResult } from '@/types/admin/Admin.types';
import type { Level } from '@/types/globalTypes';
import type {
  GrammarRuleSummary,
  GrammarRuleDetailApiResponse,
  GrammarTier,
} from '@/types/grammar/Grammar.types';

export interface GetGrammarRulesParams {
  level?: Level;
  search?: string;
  tier?: GrammarTier;
}

export const grammarRulesApi = {
  getAll: (params?: GetGrammarRulesParams) =>
    api.get<GrammarRuleSummary[]>('/grammar-rules', {
      params: {
        ...(params?.level !== undefined ? { level: params.level } : {}),
        ...(params?.search !== undefined ? { search: params.search } : {}),
        ...(params?.tier !== undefined ? { tier: params.tier } : {}),
      },
    }),

  getBySlug: (slug: string) => api.get<GrammarRuleDetailApiResponse>(`/grammar-rules/${slug}`),

  bulkCreate: (rules: unknown[]) => api.post<ImportResult>('/grammar-rules/bulk', { rules }),
};