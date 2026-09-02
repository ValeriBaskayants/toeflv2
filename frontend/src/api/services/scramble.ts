import { api } from '../client';
import type {
  ScrambleExerciseSummary,
  ScrambleExerciseDetail,
  ScrambleSessionStart,
  ScrambleSubmitResult,
  ScrambleMode,
  ScrambleBlockStart,
  ScrambleBlockCurrentItem,
  ScrambleBlockSubmitResult,
  ScrambleBlockExpireResult,
  ScrambleBlockReview,
} from '@/types/scramble/Scramble.types';
import type { Level } from '@/types/globalTypes';
import type { ImportResult } from '@/types/admin/Admin.types';

export interface GetScrambleParams {
  level?: Level;
  topic?: string;
  topicSlug?: string;
  mode?: ScrambleMode;
}

export interface StartScrambleSessionPayload {
  exerciseId: string;
  mode: ScrambleMode;
}

export interface SubmitScramblePayload {
  wordOrder: string[];
  timeSpentSec: number;
  usedHint: boolean;
}

export const scrambleApi = {
  getExercises: (params?: GetScrambleParams) =>
    api.get<ScrambleExerciseSummary[]>('/scramble', { params }),

  getExerciseById: (id: string, mode?: ScrambleMode) =>
    api.get<ScrambleExerciseDetail>(`/scramble/${id}`, {
      params: mode !== undefined ? { mode } : undefined,
    }),

  startSession: (payload: StartScrambleSessionPayload) =>
    api.post<ScrambleSessionStart>('/scramble/sessions', payload),

  submitAnswer: (sessionId: string, payload: SubmitScramblePayload) =>
    api.post<ScrambleSubmitResult>(`/scramble/sessions/${sessionId}/submit`, payload),

  startBlock: (level: Level) => api.post<ScrambleBlockStart>('/scramble/blocks', { level }),

  getCurrentBlockItem: (blockId: string) =>
    api.get<ScrambleBlockCurrentItem>(`/scramble/blocks/${blockId}/current`),

  submitBlockItem: (blockId: string, payload: SubmitScramblePayload) =>
    api.post<ScrambleBlockSubmitResult>(`/scramble/blocks/${blockId}/submit`, payload),

  expireBlock: (blockId: string) =>
    api.post<ScrambleBlockExpireResult>(`/scramble/blocks/${blockId}/expire`),

  getBlockReview: (blockId: string) =>
    api.get<ScrambleBlockReview>(`/scramble/blocks/${blockId}/review`),

  bulkCreate: (items: unknown[]) => api.post<ImportResult>('/scramble/bulk', { items }),
};