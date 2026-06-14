import type {
  GetMultipleChoiceQuery,
  MultipleChoice,
  SubmitMCSessionResponse,
  SubmitMCSessionDto,
  BulkCreateResponse,
} from '@/types/multipleChoice/MultipleChoice.types';
import { api } from '../client';

export const MultipleChoiceApi = {
  getList: (params: GetMultipleChoiceQuery) =>
    api.get<MultipleChoice[]>('/multiple-choice', { params }),

  submit: (payload: SubmitMCSessionDto, timezone?: string) =>
    api.post<SubmitMCSessionResponse>('/multiple-choice/submit', payload, {
      params: timezone !== undefined ? { timezone } : undefined,
    }),

  bulkCreate: (items: unknown[]) =>
    api.post<BulkCreateResponse>('/multiple-choice/bulk', { items }),
};