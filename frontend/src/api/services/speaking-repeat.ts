import { api } from '@/api';
import type { Level } from '@/types/globalTypes';
import type {
  SpeakingRepeatSetSummary,
  SpeakingStartSessionResponse,
  SpeakingItemAudioResponse,
  SpeakingSubmitAttemptResponse,
  SpeakingSessionReview,
} from '@/types/speaking/Speaking.types';

export const speakingRepeatApi = {
  getSets: async (level: Level) => {
    const { data } = await api.get<SpeakingRepeatSetSummary[]>(`/speaking-repeat/sets/${level}`);
    return data;
  },

  startSession: async (setId: string) => {
    const { data } = await api.post<SpeakingStartSessionResponse>(`/speaking-repeat/sessions/${setId}/start`);
    return data;
  },

  getItemAudio: async (setId: string, itemId: string) => {
    const { data } = await api.get<SpeakingItemAudioResponse>(
      `/speaking-repeat/sets/${setId}/items/${itemId}/audio`,
    );
    return data;
  },

  submitAttempt: async (sessionId: string, itemId: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const { data } = await api.post<SpeakingSubmitAttemptResponse>(
      `/speaking-repeat/sessions/${sessionId}/items/${itemId}/answer`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  completeSession: async (sessionId: string) => {
    const { data } = await api.post(`/speaking-repeat/sessions/${sessionId}/complete`);
    return data;
  },

  getSessionReview: async (sessionId: string) => {
    const { data } = await api.get<SpeakingSessionReview>(`/speaking-repeat/sessions/${sessionId}/review`);
    return data;
  },
};