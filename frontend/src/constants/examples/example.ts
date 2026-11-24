import type { ContentType } from '../../types/admin/Admin.types';
import { EXERCISES_EXAMPLES } from './exercises.examples';
import { GRAMMAR_RULES_EXAMPLE } from './grammar-rules.examples';
import { VOCABULARY_EXAMPLES } from './vocabulary.examples';
import { READINGS_EXAMPLES } from './readings.examples';
import { MULTIPLE_CHOICE_EXAMPLES } from './multiple-choice.examples';
import { LISTENING_EXAMPLES } from './listening.examples';
import { SPEAKING_REPEAT_EXAMPLES } from './speaking-repeat.examples';
import { SPEAKING_INTERVIEW_EXAMPLES } from './speaking-interview.examples';
import { WRITING_PROMPTS_EXAMPLES } from './writing-prompts.examples';
import { SCRAMBLE_EXAMPLES } from './scramble.examples';

const asJson = (value: unknown): string => JSON.stringify(value, null, 2);

export const EXAMPLES: Record<ContentType, string> = {
  listening: LISTENING_EXAMPLES,
  speakingRepeat: SPEAKING_REPEAT_EXAMPLES,
  speakingInterview: SPEAKING_INTERVIEW_EXAMPLES,
  writingPrompts: WRITING_PROMPTS_EXAMPLES,
  scramble: SCRAMBLE_EXAMPLES,
  exercises: asJson(EXERCISES_EXAMPLES),
  grammarRules: asJson(GRAMMAR_RULES_EXAMPLE),
  vocabulary: asJson(VOCABULARY_EXAMPLES),
  readings: asJson(READINGS_EXAMPLES),
  multipleChoice: asJson(MULTIPLE_CHOICE_EXAMPLES),
};