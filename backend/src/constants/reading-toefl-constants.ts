import type { Level } from '@prisma/client';
import { LEVEL_ORDER } from './level-requirements';
import { visibleLengthOf } from '../common/utils/c-test.util';




export type ReadingTaskKind = 'COMPLETE_WORDS' | 'DAILY_LIFE' | 'ACADEMIC_PASSAGE';
export type ReadingMode = 'PRACTICE' | 'TOEFL';

export interface WordRange {
  min: number;
  max: number;
}


export const COMPLETE_WORDS_BLANK_COUNT = 10; 
export const DAILY_LIFE_MIN_QUESTIONS = 2;
export const DAILY_LIFE_MAX_QUESTIONS = 3;
export const ACADEMIC_PASSAGE_QUESTIONS = 5;
export const MC_OPTIONS_COUNT = 4; 


export const COMPLETE_WORDS_WORD_RANGE: WordRange = { min: 60, max: 110 }; 
export const DAILY_LIFE_WORD_RANGE: WordRange = { min: 15, max: 150 }; 
export const ACADEMIC_WORD_RANGE: WordRange = { min: 120, max: 230 }; 

export const OFFICIAL_ACADEMIC_QUESTION_TYPES: readonly string[] = [
  'MAIN_IDEA',
  'DETAIL',
  'INFERENCE',
  'VOCAB_IN_CONTEXT',
  'RELATIONSHIP_BETWEEN_IDEAS',
  'RHETORICAL_PURPOSE',
];


interface LevelRange {
  from: Level;
  to: Level;
}

const OFFICIAL_LEVEL_RANGE: Readonly<Record<ReadingTaskKind, LevelRange>> = {
  COMPLETE_WORDS: { from: 'B1', to: 'C2' }, 
  DAILY_LIFE: { from: 'A1', to: 'C1' },
  ACADEMIC_PASSAGE: { from: 'B1', to: 'C2' },
};

export function isLevelInOfficialRange(kind: ReadingTaskKind, level: Level): boolean {
  const range = OFFICIAL_LEVEL_RANGE[kind];
  const idx = LEVEL_ORDER.indexOf(level);
  return idx >= LEVEL_ORDER.indexOf(range.from) && idx <= LEVEL_ORDER.indexOf(range.to);
}



export const TOEFL_SECONDS_PER_ITEM = 36;
export const TOEFL_SUBMIT_GRACE_SEC = 5;

export function toeflTimeLimitSec(itemCount: number): number {
  return itemCount * TOEFL_SECONDS_PER_ITEM;
}

export function elapsedSec(startedAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));
}

export function isTimedOut(mode: ReadingMode | null, timeLimitSec: number | null, spentSec: number): boolean {
  return mode === 'TOEFL' && timeLimitSec !== null && spentSec > timeLimitSec + TOEFL_SUBMIT_GRACE_SEC;
}


/** Legacy economy: ~25 XP for a 5-question material. */
export const READING_XP_PER_ITEM = 5;
const READING_XP_MIN = 10;
const READING_XP_MAX = 50;

export function readingBaseXp(itemCount: number): number {
  return Math.min(READING_XP_MAX, Math.max(READING_XP_MIN, itemCount * READING_XP_PER_ITEM));
}

export const UNCOUNTED_ATTEMPT_XP_FACTOR = 0.3;
export const MAX_ACTIVITY_MINUTES_PER_TASK = 30;
export const NO_ANSWER_LABEL = '(no answer)';


const MISTAKE_PREFIX: Readonly<Record<ReadingTaskKind, string>> = {
  COMPLETE_WORDS: 'rcw',
  DAILY_LIFE: 'rdl',
  ACADEMIC_PASSAGE: 'rap',
};

export function readingMistakeTargetId(kind: ReadingTaskKind, taskId: string, itemKey: string | number): string {
  return `${MISTAKE_PREFIX[kind]}:${taskId}:${String(itemKey)}`;
}

export const READING_KIND_LABEL: Readonly<Record<ReadingTaskKind, string>> = {
  COMPLETE_WORDS: 'Complete the Words',
  DAILY_LIFE: 'Read in Daily Life',
  ACADEMIC_PASSAGE: 'Read an Academic Passage',
};


export function normalizeTypedAnswer(text: string): string {
  return text.trim().toLowerCase();
}

export function isValidWordPrefix(fullWord: string, visiblePrefix: string): boolean {
  return (
    fullWord.length >= 2 &&
    visiblePrefix.length === visibleLengthOf(fullWord) &&
    fullWord.toLowerCase().startsWith(visiblePrefix.toLowerCase())
  );
}