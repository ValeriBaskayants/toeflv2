import { randomUUID } from 'node:crypto';
import type { GrammarRole, Level, ScrambleMode } from '@prisma/client';
import { isGuidedLevel } from 'src/constants/level-policy';
import { MIN_DRAGGABLE_CHUNKS, EXAM_MAX_DISTRACTORS, MODE_DISTRACTOR_COUNT } from 'src/constants/scramble-constants';

export interface ScrambleWordEntity {
  id: string;
  word: string;
  role: GrammarRole;
  position: number;
  isDistractor: boolean;
  requiresUserInput: boolean;
  isFixed?: boolean | null;
}

export interface ScrambleAlternativeEntity {
  order: string[];
}

export interface FilledBlank {
  position: number;
  text: string;
}

export type FrameItem =
  | { kind: 'fixed'; text: string }
  | { kind: 'slot'; index: number }
  | { kind: 'blank'; position: number };

const isDraggable = (w: Pick<ScrambleWordEntity, 'isDistractor' | 'requiresUserInput' | 'isFixed'>): boolean =>
  !w.isDistractor && !w.requiresUserInput && w.isFixed !== true;

export function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
}

export function orderedDraggableIds(words: ScrambleWordEntity[]): string[] {
  return words.filter(isDraggable).sort((a, b) => a.position - b.position).map((w) => w.id);
}

export interface ScrambleAuthoringInput {
  prompt?: string;
  sentence: string;
  words: Array<{ id: string; word: string; position: number; isDistractor?: boolean; requiresUserInput?: boolean; isFixed?: boolean }>;
  allowedModes: ScrambleMode[];
  alternatives?: Array<{ order: string[] }>;
}

export function validateScrambleExercise(item: ScrambleAuthoringInput): string[] {
  const problems: string[] = [];
  const words = item.words;

  const ids = words.map((w) => w.id);
  if (new Set(ids).size !== ids.length) problems.push('word ids must be unique');
  if (words.some((w) => w.word.trim() === '')) problems.push('a word is empty');
  if (words.some((w) => w.isDistractor === true && (w.requiresUserInput === true || w.isFixed === true))) {
    problems.push('a distractor cannot be fixed or typed');
  }

  const frame = words.filter((w) => w.isDistractor !== true).sort((a, b) => a.position - b.position);
  const positionsOk = frame.every((w, i) => w.position === i);
  if (!positionsOk) problems.push(`frame positions must be exactly 0..${frame.length - 1} (no gaps, no duplicates)`);

  const draggable = words.filter((w) => w.isDistractor !== true && w.requiresUserInput !== true && w.isFixed !== true);
  if (draggable.length < MIN_DRAGGABLE_CHUNKS) problems.push(`needs at least ${MIN_DRAGGABLE_CHUNKS} draggable chunks, got ${draggable.length}`);

  const distractors = words.filter((w) => w.isDistractor === true).length;
  if (distractors > distractors) problems.push(`at most ${distractors} distractors, got ${distractors}`);

  if (positionsOk && tokens(frame.map((w) => w.word).join(' ')).join(' ') !== tokens(item.sentence).join(' ')) {
    problems.push('sentence does not match the words in position order');
  }

  const key = [...draggable].sort((a, b) => a.position - b.position).map((w) => w.id);
  (item.alternatives ?? []).forEach((alt, i) => {
    const sameSet = alt.order.length === key.length && new Set(alt.order).size === key.length && alt.order.every((id) => key.includes(id));
    if (!sameSet) problems.push(`alternatives[${i}] must use exactly the draggable word ids`);
    else if (alt.order.every((id, idx) => id === key[idx])) problems.push(`alternatives[${i}] equals the main answer`);
  });

  if (item.allowedModes.includes('EXPERT')) {
    if ((item.prompt ?? '').trim() === '') problems.push('exam-eligible (EXPERT) items need a prompt (the context sentence)');
    if (words.some((w) => w.requiresUserInput === true)) problems.push('exam-eligible (EXPERT) items cannot have typed blanks');
    if (distractors > EXAM_MAX_DISTRACTORS) problems.push(`exam-eligible (EXPERT) items allow at most ${EXAM_MAX_DISTRACTORS} distractor`);
  }
  return problems;
}

export function rekeyWordIds<W extends { id: string }>(
  words: W[],
  alternatives: Array<{ order: string[] }> | undefined,
): { words: W[]; alternatives: Array<{ order: string[] }> } {
  const map = new Map(words.map((w) => [w.id, randomUUID()]));
  return {
    words: words.map((w) => ({ ...w, id: map.get(w.id) ?? w.id })),
    alternatives: (alternatives ?? []).map((a) => ({ order: a.order.map((id) => map.get(id) ?? id) })),
  };
}

export function buildFrame(words: ScrambleWordEntity[]): FrameItem[] {
  let slot = 0;
  return words
    .filter((w) => !w.isDistractor)
    .sort((a, b) => a.position - b.position)
    .map((w): FrameItem => {
      if (w.requiresUserInput) return { kind: 'blank', position: w.position };
      if (w.isFixed === true) return { kind: 'fixed', text: w.word };
      return { kind: 'slot', index: slot++ };
    });
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

export interface PublicTile {
  id: string;
  word: string;
  role?: GrammarRole;
}

export interface PublicBlank {
  position: number;
  hint?: GrammarRole;
  maxLength: number;
}

export function prepareWordsForMode(words: ScrambleWordEntity[], level: Level, mode?: ScrambleMode): { tiles: PublicTile[]; blanks: PublicBlank[] } {
  const draggable = words.filter((w) => !w.requiresUserInput && w.isFixed !== true);
  const correct = draggable.filter((w) => !w.isDistractor);
  const distractors = draggable.filter((w) => w.isDistractor).slice(0, mode === undefined ? 0 : MODE_DISTRACTOR_COUNT[mode]);

  const pool = [...correct, ...distractors];
  const answerOrder = orderedDraggableIds(words);
  let bank = shuffled(pool);
  for (let attempt = 0; attempt < 5 && correct.length > 1 && bank.filter((w) => !w.isDistractor).map((w) => w.id).join() === answerOrder.join(); attempt++) {
    bank = shuffled(pool);
  }

  const revealRole = mode !== 'EXPERT' && isGuidedLevel(level);
  return {
    tiles: bank.map((w) => ({ id: w.id, word: w.word, ...(revealRole ? { role: w.role } : {}) })),
    blanks: words
      .filter((w) => w.requiresUserInput)
      .sort((a, b) => a.position - b.position)
      .map((w) => ({ position: w.position, ...(revealRole ? { hint: w.role } : {}), maxLength: Math.max(10, w.word.length + 5) })),
  };
}

export function gradeSubmission(
  words: ScrambleWordEntity[],
  alternatives: ScrambleAlternativeEntity[] | undefined,
  wordOrder: string[],
  filledBlanks: FilledBlank[] | undefined,
): boolean {
  const key = orderedDraggableIds(words);
  const distractorIds = new Set(words.filter((w) => w.isDistractor).map((w) => w.id));

  const noRepeats = new Set(wordOrder).size === wordOrder.length;
  const noDistractor = !wordOrder.some((id) => distractorIds.has(id));
  const accepted = [key, ...(alternatives ?? []).map((a) => a.order)];
  const tilesCorrect = noRepeats && noDistractor && accepted.some((order) => order.length === wordOrder.length && order.every((id, i) => id === wordOrder[i]));

  const filled = new Map((filledBlanks ?? []).map((b) => [b.position, b.text.trim().toLowerCase()]));
  const blanksCorrect = words.filter((w) => w.requiresUserInput).every((w) => filled.get(w.position) === w.word.trim().toLowerCase());

  return tilesCorrect && blanksCorrect;
}

export function diagnoseMistake(submitted: string[], words: ScrambleWordEntity[]): string[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  if (submitted.length === 0) return ['not-answered'];
  if (submitted.some((id) => byId.get(id)?.isDistractor === true)) return ['wrong-word-form'];
  const key = orderedDraggableIds(words);
  if (key.some((id) => !submitted.includes(id))) return ['incomplete-sentence'];
  return ['word-order'];
}

export function shuffleIds<T>(items: T[]): T[] {
  return shuffled(items);
}