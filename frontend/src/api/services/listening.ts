import { api } from '@/api';
import type { ImportResult } from '@/types/admin/Admin.types';
import type { GetListeningParams, ListeningMaterialListItem, ListeningMaterialDetail, StartSessionPayload, StartSessionResponse, PlayResponse, SaveNotesPayload, SubmitAnswerPayload, SubmitAnswerResponse, CompleteSessionResponse, SessionHistoryItem } from '@/types/listening/Listening.types';

export const listeningApi = {
  bulkCreate: (listening: unknown[]) =>
    api.post<ImportResult>('/listening/bulk', { items: listening }),

  getAll: (params?: GetListeningParams) =>
    api.get<ListeningMaterialListItem[]>('/listening', { params }),

  getById: (id: string) =>
    api.get<ListeningMaterialDetail>(`/listening/${id}`),

  startSession: (payload: StartSessionPayload) =>
    api.post<StartSessionResponse>('/listening/sessions', payload),

  recordPlay: (sessionId: string) =>
    api.post<PlayResponse>(`/listening/sessions/${sessionId}/play`),

  saveNotes: (sessionId: string, payload: SaveNotesPayload) =>
    api.patch<{ id: string; notes: unknown[] }>(
      `/listening/sessions/${sessionId}/notes`,
      payload,
    ),

  submitAnswer: (sessionId: string, payload: SubmitAnswerPayload) =>
    api.post<SubmitAnswerResponse>(
      `/listening/sessions/${sessionId}/answers`,
      payload,
    ),

  completeSession: (sessionId: string) =>
    api.post<CompleteSessionResponse>(
      `/listening/sessions/${sessionId}/complete`,
    ),

  getUserSessions: (materialId?: string) =>
    api.get<SessionHistoryItem[]>('/listening/sessions', {
      params: materialId ? { materialId } : undefined,
    }),
};


