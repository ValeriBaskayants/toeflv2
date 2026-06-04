import { api } from '@/api/client';
import type { ImportResult } from '@/types/admin/Admin.types';
import type {
  VocabularyWord,
  Flashcard,
  VocabUserProgress,
  ReviewResult,
  ReviewWordPayload,
  GetVocabularyParams,
  GetFlashcardsParams,
} from '@/types/vocabulary/Vocabulary';

export const VocabularyApi = {
  getAll: (params?: GetVocabularyParams) => api.get<VocabularyWord[]>('/vocabulary', { params }),

  getFlashcards: (params?: GetFlashcardsParams) =>
    api.get<Flashcard[]>('/vocabulary/flashcards', { params }),

  getUserProgress: () => api.get<VocabUserProgress>('/vocabulary/user-progress'),

  reviewWord: (payload: ReviewWordPayload) => api.post<ReviewResult>('/vocabulary/review', payload),
  bulkCreate: (vocabulary: unknown[]) => api.post<ImportResult>('/vocabulary/bulk', { vocabulary }),
};
