import type { RoadmapResponse } from '@/types/roadmap/Roadmap.types';
import { api } from '../client';

export const roadmapApi = {
  getRoadmap: () => api.get<RoadmapResponse>('/roadmap'),
};