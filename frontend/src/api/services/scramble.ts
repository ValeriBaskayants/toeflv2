import { api } from '../client';
import type {
  ScrambleBlockStart,
  ScrambleBlockItem,
  ScrambleLinearSubmitResult,
  ScrambleFreeNavItemsResponse,
  ScrambleFinishResult,
  ScrambleBlockReview,
} from '@/types/scramble/Scramble.types';
import type { Level } from '@/types/globalTypes';
import type { ImportResult } from '@/types/admin/Admin.types';

export interface SubmitScrambleItemPayload {
  wordOrder: string[];
  filledBlanks?: Array<{ position: number; text: string }>;
  timeSpentSec: number;
  usedHint: boolean;
}

export interface SaveDraftPayload {
  exerciseId: string;
  wordOrder: string[];
  filledBlanks?: Array<{ position: number; text: string }>;
  usedHint: boolean;
}

export const scrambleApi = {
  startPracticeSet: (level: Level, count: number) =>
    api.post<ScrambleBlockStart>('/scramble/practice-sets', { level, count }),

  startExam: () => api.post<ScrambleBlockStart>('/scramble/blocks', {}),

  // guided linear flow (A1–A2+)
  getCurrentBlockItem: (blockId: string) =>
    api.get<ScrambleBlockItem>(`/scramble/blocks/${blockId}/current`),

  submitBlockItem: (blockId: string, payload: SubmitScrambleItemPayload) =>
    api.post<ScrambleLinearSubmitResult>(`/scramble/blocks/${blockId}/submit`, payload),

  // free-navigation flow (B1+ practice-set и EXAM)
  getBlockItems: (blockId: string) =>
    api.get<ScrambleFreeNavItemsResponse>(`/scramble/blocks/${blockId}/items`),

  saveDraft: (blockId: string, payload: SaveDraftPayload) =>
    api.post<{ saved: true; exerciseId: string }>(`/scramble/blocks/${blockId}/draft`, payload),

  finishBlock: (blockId: string) => api.post<ScrambleFinishResult>(`/scramble/blocks/${blockId}/finish`),

  // общее для обоих потоков
  expireBlock: (blockId: string) => api.post<ScrambleFinishResult>(`/scramble/blocks/${blockId}/expire`),

  getBlockReview: (blockId: string) => api.get<ScrambleBlockReview>(`/scramble/blocks/${blockId}/review`),

  bulkCreate: (items: unknown[]) => api.post<ImportResult>('/scramble/bulk', { items }),
};