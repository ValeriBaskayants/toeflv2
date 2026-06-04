import type { ImportResult } from '@/types/admin/Admin.types';
import { api } from '../client';
import type { WritingPrompt, WritingSubmission } from '@/types/writing/Writing.types';
export interface GetPromptsParams {
  level?: string;
}
export interface SubmitWritingPayload {
  promptId: string;
  text: string;
}
export interface SubmitWritingResponse {
  submissionId: string;
  status: 'PENDING';
}

export interface SubmissionWithPrompt extends WritingSubmission {
  prompt: WritingPrompt;
}

export const writingApi = {
  getPrompts: (params?: GetPromptsParams) =>
    api.get<WritingPrompt[]>('/writing/prompts', { params }),

  getPromptById: (id: string) => api.get<WritingPrompt>(`/writing/prompts/${id}`),

  submit: (payload: SubmitWritingPayload) =>
    api.post<SubmitWritingResponse>('/writing/submit', payload),

  getSubmission: (id: string) => api.get<WritingSubmission>(`/writing/submissions/${id}`),

  getSubmissions: (promptId?: string) =>
    api.get<SubmissionWithPrompt[]>('/writing/submissions', {
      params: promptId ? { promptId } : undefined,
    }),
  bulkCreatePrompts: (writingPrompts: unknown[]) =>
    api.post<ImportResult>('/writing/prompts/bulk', { prompts: writingPrompts }),
};
