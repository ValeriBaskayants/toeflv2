import { api } from '@/api/client';
import type { ImportResult } from '@/types/admin/Admin.types';
import type {
  VocabularyWord,
  Flashcard,
  VocabCard,
  VocabUserProgress,
  ReviewResult,
  ReviewWordPayload,
  GetVocabularyParams,
  GetFlashcardsParams,
  SubmitVocabAnswerPayload,
  SubmitAnswerResult,
} from '@/types/vocabulary/Vocabulary';

export const VocabularyApi = {
  getAll: (params?: GetVocabularyParams) => api.get<VocabularyWord[]>('/vocabulary', { params }),

  getFlashcards: (params?: GetFlashcardsParams) =>
    api.get<Flashcard[]>('/vocabulary/flashcards', { params }),

  reviewWord: (payload: ReviewWordPayload) =>
    api.post<ReviewResult>('/vocabulary/review', payload),

  getSession: (params?: GetFlashcardsParams) =>
    api.get<VocabCard[]>('/vocabulary/session', { params }),

  submitAnswer: (payload: SubmitVocabAnswerPayload) => {
    const { timezone, ...bodyData } = payload;
    return api.post<SubmitAnswerResult>('/vocabulary/answer', bodyData, {
      params: { timezone },
    });
  },

  getUserProgress: () => api.get<VocabUserProgress>('/vocabulary/user-progress'),

  bulkCreate: (vocabulary: unknown[]) => api.post<ImportResult>('/vocabulary/bulk', { vocabulary }),
};