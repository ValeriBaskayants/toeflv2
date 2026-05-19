import type { DashboardData, LevelUpResult } from '@/types/progress/Progress.types';
import { api } from '../client';

export const progressApi = {
  getDashboard: () => api.get<DashboardData>('/progress/dashboard'),

  levelUp: () => api.post<LevelUpResult | null>('/progress/level-up'),
};
