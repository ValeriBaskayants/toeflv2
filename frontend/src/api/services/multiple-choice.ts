import type { GetMultipleChoiceQuery, MultipleChoice, SubmitMCSessionResponse, SubmitMCSessionDto } from '@/types/multipleChoice/MultipleChoice.types';
import { api } from '../client';
import type { ImportResult } from '@/types/admin/Admin.types';
import type { Level } from '../../types/globalTypes';


export const MultipleChoiceApi = {
  getList: (params: GetMultipleChoiceQuery) =>
    api.get<MultipleChoice[]>('/multiple-choice', { params }),

  submit: (payload: SubmitMCSessionDto, level: Level, timezone?: string) =>
    api.post<SubmitMCSessionResponse>(
      '/multiple-choice/submit',
      payload,
      { params: { level, timezone } },
    ),

  bulkCreate: (multipleChoice: unknown[]) =>
    api.post<ImportResult>('/multiple-choice/bulk', { items: multipleChoice }),
};


