import type { ImportResult } from '@/types/admin/Admin.types';
import { api } from '../client';
import type {
  WritingPromptWithStatus,
  WritingSubmission,
  StartSessionResponse,
  SubmitSessionResponse,
} from '@/types/writing/Writing.types';

export interface GetPromptsParams {
  level?: string;
}

export const writingApi = {
  getPrompts: (params?: GetPromptsParams) =>
    api.get<WritingPromptWithStatus[]>('/writing/prompts', { params }),

  startSession: (promptId: string) =>
    api.post<StartSessionResponse>('/writing/sessions', { promptId }),

  startToeflEmail: () => api.post<StartSessionResponse>('/writing/toefl-mode/email/start'),
  startToeflDiscussion: () => api.post<StartSessionResponse>('/writing/toefl-mode/discussion/start'),

  submitSession: (sessionId: string, text: string) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return api.post<SubmitSessionResponse>('/writing/sessions/submit', { sessionId, text }, { params: { timezone } });
  },

  getSubmission: (id: string) => api.get<WritingSubmission>(`/writing/submissions/${id}`),

  getSubmissions: () => api.get<WritingSubmission[]>('/writing/submissions'),

  bulkCreatePrompts: (writingPrompts: unknown[]) =>
    api.post<ImportResult>('/writing/prompts/bulk', { prompts: writingPrompts }),
};