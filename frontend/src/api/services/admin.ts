import { api } from '@/api';
import type { AdminStats, ImportResult } from '@/types/admin/Admin.types';

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),

  importExercises: (exercises: unknown[]) =>
    api.post<ImportResult>('/admin/import/exercises', { exercises }),

  importGrammarRules: (grammarRules: unknown[]) =>
    api.post<ImportResult>('/admin/import/grammar-rules', { grammarRules }),

  importVocabulary: (vocabulary: unknown[]) =>
    api.post<ImportResult>('/admin/import/vocabulary', { vocabulary }),

  importReadings: (readings: unknown[]) =>
    api.post<ImportResult>('/admin/import/readings', { readings }),

  importMultipleChoice: (multipleChoice: unknown[]) =>
    api.post<ImportResult>('/admin/import/multiple-choice', { multipleChoice }),

  importWritingPrompts: (writingPrompts: unknown[]) =>
    api.post<ImportResult>('/admin/import/writing-prompts', { writingPrompts }),

  importListening: (listening: unknown[]) =>
    api.post<ImportResult>('/admin/import/listening', { listening }),
};