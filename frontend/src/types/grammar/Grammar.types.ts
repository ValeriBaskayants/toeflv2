import { type ID, Level, type ISODateString } from '../globalTypes';

export interface GrammarExample {
  sentence: string;
  translation?: string;
}

export interface GrammarUsage {
  title: string;
  explanation: string;
  examples: GrammarExample[];
}

export interface GrammarSection {
  title: string;
  content: string;
  examples: GrammarExample[];
}

export interface GrammarComparison {
  compareWith: string;
  explanation: string;
  examples: GrammarExample[];
}

export interface GrammarRuleSummary {
  id: ID;
  topic: string;
  slug: string;
  level: Level;
  summary: string;
  signalWords: string[];
  relatedTopics: string[];
  createdAt: ISODateString;
}

export interface GrammarRuleDetail extends GrammarRuleSummary {
  coreConcept: string;
  structure: string;
  usages: GrammarUsage[];
  sections: GrammarSection[];
  comparisons: GrammarComparison[];
  commonMistakes: string[];
  updatedAt: ISODateString;
}
