import type { DashboardData, LevelUpResult } from '@/types/progress/Progress.types';
import { api } from '../client';

// Auth is handled via JWT header (see client.ts interceptor) — no userId param needed.
export const progressApi = {
    getDashboard: () =>
        api.get<DashboardData>('/progress/dashboard'),

    // BUG FIX: was api.get — must be api.post
    levelUp: () =>
        api.post<LevelUpResult | null>('/progress/level-up'),
};