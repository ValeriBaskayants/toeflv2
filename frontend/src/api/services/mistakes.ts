
import { api } from '../client';
import type {
  UserMistake,
  WeakSpot,
  HeatmapCell,
  DueMistake,
  DueCount,
  MasteredResult,
} from '@/types/mistakes/Mistakes.types';

export const mistakesApi = {
  /** GET /mistakes */
  getAll: (source?: string) =>
    api.get<UserMistake[]>('/mistakes', {
      params: source ? { source } : undefined,
    }),

  /** GET /mistakes/weak-spots */
  getWeakSpots: () => api.get<WeakSpot[]>('/mistakes/weak-spots'),

  /** GET /mistakes/heatmap */
  getHeatmap: () => api.get<HeatmapCell[]>('/mistakes/heatmap'),

  /** GET /mistakes/due?limit=N */
  getDueForReview: (limit?: number) =>
    api.get<DueMistake[]>('/mistakes/due', {
      params: limit ? { limit } : undefined,
    }),

  /** GET /mistakes/due/count */
  getDueCount: () => api.get<DueCount>('/mistakes/due/count'),

  /** PATCH /mistakes/:id/mastered */
  markMastered: (id: string) =>
    api.patch<MasteredResult>(`/mistakes/${id}/mastered`),
};