import type { ContentType } from '../../types/admin/Admin.types';
import { SCRAMBLE_EXAMPLES } from './scramble.examples';
import { GRAMMAR_RULES_EXAMPLE } from './grammar-rules.examples';
import { EXERCISES_EXAMPLES } from './exercises.examples';
import { VOCABULARY_EXAMPLES } from './vocabulary.examples';
import { READINGS_EXAMPLES } from './readings.examples';
import { MULTIPLE_CHOICE_EXAMPLES } from './multiple-choice.examples';
import { WRITING_PROMPTS_EXAMPLES } from './writing-prompts.examples';
import { LISTENING_EXAMPLES } from './listening.examples';

export const EXAMPLES: Record<ContentType, string> = {
  scramble: JSON.stringify(SCRAMBLE_EXAMPLES, null, 2),
  exercises: JSON.stringify(EXERCISES_EXAMPLES, null, 2),
  grammarRules: JSON.stringify(GRAMMAR_RULES_EXAMPLE, null, 2),
  vocabulary: JSON.stringify(VOCABULARY_EXAMPLES, null, 2),
  readings: JSON.stringify(READINGS_EXAMPLES, null, 2),
  multipleChoice: JSON.stringify(MULTIPLE_CHOICE_EXAMPLES, null, 2),
  writingPrompts: JSON.stringify(WRITING_PROMPTS_EXAMPLES, null, 2),
  listening: JSON.stringify(LISTENING_EXAMPLES, null, 2),
};