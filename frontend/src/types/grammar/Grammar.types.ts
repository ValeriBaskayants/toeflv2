import type { ID, ISODateString, Level } from '@/types/globalTypes';

export type GrammarTier = 'FOUNDATION' | 'ADVANCED';

export interface GrammarExample {
  sentence: string;
  translation?: string;
}

export interface GrammarUsage {
  title: string;
  explanation: string;
  examples: GrammarExample[];
  letter?: string;
  register?: string;
}

export interface GrammarSection {
  title: string;
  content: string;
  examples: GrammarExample[];
  letter?: string;
  register?: string;
}

export interface GrammarComparison {
  compareWith: string;
  explanation: string;
  examples: GrammarExample[];
  letter?: string;
}

export interface GrammarCrossReference {
  label: string;
  targetSlug?: string;
  targetAnchor?: string;
}

export interface RelatedExercise {
  id: string;
  sentence: string;
  difficulty: string;
  topic: string;
}

export type GrammarUserStatus = 'not_started' | 'in_progress' | 'mastered';

export interface GrammarRuleSummary {
  id: ID;
  topic: string;
  slug: string;
  level: Level;
  summary: string;
  signalWords: string[];
  relatedTopics: string[];
  createdAt: ISODateString;
  tier: GrammarTier;

  exerciseCount: number;
  userStatus: GrammarUserStatus;
}

export interface GrammarRuleDetail {
  id: ID;
  topic: string;
  slug: string;
  level: Level;
  summary: string;
  coreConcept: string;
  structure: string;
  usages: GrammarUsage[];
  sections: GrammarSection[];
  comparisons: GrammarComparison[];
  commonMistakes: string[];
  signalWords: string[];
  relatedTopics: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  tier: GrammarTier;
  sourceAttribution?: string;
  crossReferences: GrammarCrossReference[];

  relatedExercises: RelatedExercise[];
  userAccuracy: number | null;
  bookmarked: boolean;
}

export interface GrammarRuleDetailApiResponse {
  rule: Omit<GrammarRuleDetail, 'relatedExercises' | 'userAccuracy' | 'bookmarked'>;
  relatedExercises: RelatedExercise[];
  userAccuracy: number | null;
  bookmarked: boolean;
}