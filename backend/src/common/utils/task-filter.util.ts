import type { Level } from '@prisma/client';

export interface TaskFilter {
  level?: Level;
  topic?: string;
  topicSlug?: string;
}

export function taskFilterWhere(filter: TaskFilter) {
  return {
    ...(filter.level !== undefined ? { level: filter.level } : {}),
    ...(filter.topic !== undefined ? { topic: { contains: filter.topic, mode: 'insensitive' as const } } : {}),
    ...(filter.topicSlug !== undefined ? { grammarTopics: { has: filter.topicSlug } } : {}),
  };
}