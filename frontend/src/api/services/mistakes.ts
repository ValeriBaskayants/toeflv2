import { api } from '../client';
import type { UserMistake, WeakSpot } from '@/types/mistakes/Mistakes.types';

export const mistakesApi = {
    getAll: (source?: string) =>
        api.get<UserMistake[]>('/mistakes', {
            params: source ? { source } : undefined,
        }),

    getWeakSpots: () =>
        api.get<WeakSpot[]>('/mistakes/weak-spots'),
};