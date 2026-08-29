import type { Level } from '@/types/globalTypes';

export type TopicNodeStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'mastered'
  | 'needs_review';

export type LevelStatus = 'completed' | 'current' | 'locked';

export interface TopicResource {
  title: string;
  url: string;
  type: 'exercise' | 'article' | 'video' | 'podcast';
  description?: string;
}

export interface TopicProgress {
  grammar:   { completed: number; required: number; accuracy: number; accuracyMin: number };
  quiz:      { completed: number; required: number };
  reading:   { completed: number; required: number };
  listening: { completed: number; required: number };
}

export interface RoadmapTopicNode {
  slug:                 string;
  title:                string;
  order:                number;
  isCore:               boolean;
  status:               TopicNodeStatus;
  summary:              string;
  progress:             TopicProgress;
  resources:            TopicResource[];
  prerequisiteSlugs:    string[];
  missingPrerequisites: string[];
}

export interface RoadmapLevelSummary {
  level:          Level;
  displayName:    string;
  status:         LevelStatus;
  topicCount:     number;
  coreTopicCount: number;
}

export interface RoadmapResponse {
  currentLevel:               string;
  levels:                     RoadmapLevelSummary[];
  currentLevelTopics:         RoadmapTopicNode[];
  nextRecommendedTopicSlug:   string | null;
  coreTopicsMasteredCount:    number;
  coreTopicsTotalCount:       number;
  curriculumReadinessPercent: number;
}

export interface TopicPracticeSource {
  type: 'grammar' | 'quiz' | 'reading' | 'scramble';
  label: string;
  totalCount: number;
  completedCount: number;
  browseUrl: string;
}

export interface TopicDetailResponse {
  slug: string;
  title: string;
  level: string;
  order: number;
  isCore: boolean;
  summary: string;
  status: TopicNodeStatus;
  prerequisiteSlugs: string[];
  missingPrerequisites: string[];
  practiceSources: TopicPracticeSource[];
  hasAnyContent: boolean;
  resources: TopicResource[];
  internalPageUrl: string | null;
}