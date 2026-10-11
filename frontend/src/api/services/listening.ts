import { api } from '../client';
import type { ImportResult } from '@/types/admin/Admin.types';
import type { ListeningMode, ListeningType } from '@/types/globalTypes';
import type {
  ListeningAnswerResponse,
  ListeningAudioResponse,
  ListeningCompleteResult,
  ListeningMaterialSummary,
  ListeningNote,
  ListeningSessionStart,
} from '@/types/listening/Listening.types';

export interface SubmitListeningAnswerPayload {
  questionId: string;
  selectedIndex: number;
}

export const listeningApi = {
  
  list: (type: ListeningType) => api.get<ListeningMaterialSummary[]>('/listening', { params: { type } }),

  startSession: (materialId: string, mode: ListeningMode) =>
    api.post<ListeningSessionStart>('/listening/sessions', { materialId, mode }),

  startToefl: (endpoint: string) => api.post<ListeningSessionStart>(`/listening/toefl-mode/${endpoint}/start`),

  
  getAudio: (sessionId: string) => api.get<ListeningAudioResponse>(`/listening/sessions/${sessionId}/audio`),

  submitAnswer: (sessionId: string, payload: SubmitListeningAnswerPayload) =>
    api.post<ListeningAnswerResponse>(`/listening/sessions/${sessionId}/answers`, payload),

  saveNotes: (sessionId: string, notes: ListeningNote[]) =>
    api.patch<{ id: string }>(`/listening/sessions/${sessionId}/notes`, { notes }),

  complete: (sessionId: string) => api.post<ListeningCompleteResult>(`/listening/sessions/${sessionId}/complete`),

  expire: (sessionId: string) => api.post<ListeningCompleteResult>(`/listening/sessions/${sessionId}/expire`),

  bulkCreate: (items: unknown[]) => api.post<ImportResult>('/listening/bulk', { items }),
};