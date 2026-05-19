import { type ID, Level, type ISODateString } from '../globalTypes';

export interface Example {
  sentence: string;
  translation?: string;
}

export interface Usage {
  title: string;
  explanation: string;
  examples: Example[];
}

export interface Section {
  title: string;
  content: string;
  examples: Example[];
}

export interface Comparison {
  compareWith: string;
  explanation: string;
  examples: Example[];
}

export interface GrammarRule {
  id: ID;
  topic: string;
  slug: string;
  level: Level;

  summary: string;
  coreConcept: string;
  structure: string;

  usages: Usage[];
  sections: Section[];
  comparisons: Comparison[];

  commonMistakes: string[];
  signalWords: string[];
  relatedTopics: string[];

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
