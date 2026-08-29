import type { RoadmapResponse, TopicDetailResponse } from '@/types/roadmap/Roadmap.types';
import { api } from '../client';

export const roadmapApi = {
  getRoadmap: () => api.get<RoadmapResponse>('/roadmap'),
  getTopicDetail: (slug: string) => api.get<TopicDetailResponse>(`/roadmap/topics/${slug}`),
};