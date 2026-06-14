import type { ImportResult } from '@/types/admin/Admin.types';
import { api } from '../client';
import type {
  WritingPromptWithStatus,
  WritingPrompt,
  WritingSubmission,
  SubmitWritingResponse,
  WritingUserStats,
} from '@/types/writing/Writing.types';

export interface GetPromptsParams {
  level?: string;
}

export interface SubmitWritingPayload {
  promptId: string;
  text: string;
}

export interface SubmissionWithPrompt extends WritingSubmission {
  prompt: WritingPrompt;
}

export const writingApi = {
  
  getPrompts: (params?: GetPromptsParams) =>
    api.get<WritingPromptWithStatus[]>('/writing/prompts', { params }),

  getPromptById: (id: string) => api.get<WritingPrompt>(`/writing/prompts/${id}`),

  
  
  submit: (payload: SubmitWritingPayload) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return api.post<SubmitWritingResponse>('/writing/submit', payload, {
      params: { timezone },
    });
  },

  getSubmission: (id: string) => api.get<WritingSubmission>(`/writing/submissions/${id}`),

  getSubmissions: (promptId?: string) =>
    api.get<SubmissionWithPrompt[]>('/writing/submissions', {
      params: promptId ? { promptId } : undefined,
    }),

  
  getUserStats: () => api.get<WritingUserStats>('/writing/stats'),

  bulkCreatePrompts: (writingPrompts: unknown[]) =>
    api.post<ImportResult>('/writing/prompts/bulk', { prompts: writingPrompts }),
};