import type { ID, ISODateString, Level } from '@/types/globalTypes';



export interface GrammarExample {
  sentence:     string;
  translation?: string;
}

export interface GrammarUsage {
  title:       string;
  explanation: string;
  examples:    GrammarExample[];
}

export interface GrammarSection {
  title:    string;
  content:  string;
  examples: GrammarExample[];
}

export interface GrammarComparison {
  compareWith: string;
  explanation: string;
  examples:    GrammarExample[];
}

export interface RelatedExercise {
  id:         string;
  sentence:   string;
  difficulty: string;
  topic:      string;
}




export type GrammarUserStatus = 'not_started' | 'in_progress' | 'mastered';

export interface GrammarRuleSummary {
  id:            ID;
  topic:         string;
  slug:          string;
  level:         Level;
  summary:       string;
  signalWords:   string[];
  relatedTopics: string[];
  createdAt:     ISODateString;

  
  exerciseCount: number;
  userStatus:    GrammarUserStatus;
}





export interface GrammarRuleDetail {
  
  id:             ID;
  topic:          string;
  slug:           string;
  level:          Level;
  summary:        string;
  coreConcept:    string;
  structure:      string;
  usages:         GrammarUsage[];
  sections:       GrammarSection[];
  comparisons:    GrammarComparison[];
  commonMistakes: string[];
  signalWords:    string[];
  relatedTopics:  string[];
  createdAt:      ISODateString;
  updatedAt:      ISODateString;

  
  relatedExercises: RelatedExercise[];
  userAccuracy:     number | null;  
  bookmarked:       boolean;
}



export interface GrammarRuleDetailApiResponse {
  rule:             Omit<GrammarRuleDetail, 'relatedExercises' | 'userAccuracy' | 'bookmarked'>;
  relatedExercises: RelatedExercise[];
  userAccuracy:     number | null;
  bookmarked:       boolean;
}