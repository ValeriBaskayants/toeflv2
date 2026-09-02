import { api } from '../client';
import type { ImportResult } from '@/types/admin/Admin.types';
import type {
  SpeakingSetListItem,
  SpeakingSetDetail,
  StartSpeakingSessionResponse,
  ItemAudioResponse,
  SubmitAttemptResponse,
  SpeakingSessionReview,
  GetSpeakingSetsParams,
} from '@/types/speaking/Speaking.types';

function guessExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

export const speakingRepeatApi = {
  bulkCreate: (sets: unknown[]) => api.post<ImportResult>('/speaking-repeat/bulk', { sets }),

  getAll: (params?: GetSpeakingSetsParams) =>
    api.get<SpeakingSetListItem[]>('/speaking-repeat', { params }),

  getScenarios: (level?: string) =>
    api.get<string[]>('/speaking-repeat/scenarios', { params: level ? { level } : undefined }),

  getSetById: (id: string) => api.get<SpeakingSetDetail>(`/speaking-repeat/sets/${id}`),

  startSession: (setId: string) =>
    api.post<StartSpeakingSessionResponse>(`/speaking-repeat/sets/${setId}/start`),

  getItemAudio: (sessionId: string, itemId: string) =>
    api.get<ItemAudioResponse>(`/speaking-repeat/sessions/${sessionId}/items/${itemId}/audio`),

  submitAttempt: (sessionId: string, itemId: string, audioBlob: Blob, mimeType: string) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, `attempt.${guessExtension(mimeType)}`);
    return api.post<SubmitAttemptResponse>(
      `/speaking-repeat/sessions/${sessionId}/items/${itemId}/answer`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  completeSession: (sessionId: string) =>
    api.post<SpeakingSessionReview>(`/speaking-repeat/sessions/${sessionId}/complete`),

  getReview: (sessionId: string) =>
    api.get<SpeakingSessionReview>(`/speaking-repeat/sessions/${sessionId}/review`),
};