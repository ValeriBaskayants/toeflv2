import { api } from '@/api';
import type { ImportResult } from '@/types/admin/Admin.types';

import type { GetExercisesParams, Exercise, SubmitResult } from '@/types/exercises/Exercise.types';

export const exercisesApi = {
  bulkCreate: (exercises: unknown[]) => 
    api.post<ImportResult>('/exercises/bulk', { exercises }),
    
  getAll: async (params?: GetExercisesParams) => {
    
    const { data } = await api.get<Exercise[]>('/exercises', { params });
    return data;
  },

  getTopics: async (level?: string) => {
    
    const { data } = await api.get<string[]>('/exercises/topics', {
      params: level !== undefined ? { level } : undefined,
    });
    return data;
  },

  submit: async (exerciseId: string, answers: string[], timezone?: string): Promise<SubmitResult> => {
    
    const { data } = await api.post<SubmitResult>(
      '/exercises/submit',
      { exerciseId, answers },
      { params: timezone !== undefined ? { timezone } : undefined },
    );
    return data;
  },
};