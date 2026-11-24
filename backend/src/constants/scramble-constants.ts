import type { Level, ScrambleMode } from '@prisma/client';
import { isGuidedLevel } from './level-policy';


export const MODE_TIME_LIMITS: Record<ScrambleMode, number> = { EASY: 60, MEDIUM: 45, HARD: 30, EXPERT: 25 };
export const EXTRA_SEC_PER_WORD = 3;

export function calcTimeLimit(mode: ScrambleMode, wordCount: number): number {
  return MODE_TIME_LIMITS[mode] + Math.max(0, wordCount - 5) * EXTRA_SEC_PER_WORD;
}

export const MODE_BASE_XP: Record<ScrambleMode, number> = { EASY: 8, MEDIUM: 12, HARD: 18, EXPERT: 25 };
export const MODE_XP_MULTIPLIER: Record<ScrambleMode, number> = { EASY: 0.7, MEDIUM: 1.0, HARD: 1.3, EXPERT: 1.6 };
export const SPEED_BONUS_THRESHOLD = 0.5;
export const SPEED_BONUS_MULTIPLIER = 1.2;
export const HINT_PENALTY_MULTIPLIER = 0.7;
export const MODE_DISTRACTOR_COUNT: Record<ScrambleMode, number> = { EASY: 0, MEDIUM: 1, HARD: 2, EXPERT: 1 };

export const EXAM_TOTAL_TIME_BUDGET_SEC = 410;
export const EXAM_BLOCK_SIZE = 10;
export const EXAM_MODE: ScrambleMode = 'EXPERT';
export const EXAM_MAX_DISTRACTORS = 1;

export const MIN_DRAGGABLE_CHUNKS = 3;
export const MAX_DISTRACTORS = 2;

/** XP multiplier for completions that do not count toward the level (replays, off-level, low accuracy). */
export const UNCOUNTED_SCRAMBLE_XP_FACTOR = 0.3;
export const BLOCK_XP_PER_CORRECT = 15;
export const MAX_ACTIVITY_MINUTES_PER_SCRAMBLE = 15;

export interface ScrambleScoreParams {
  isCorrect: boolean;
  mode: ScrambleMode;
  timeSpentSec: number;
  timeLimitSec: number;
  usedHint: boolean;
  streakMultiplier: number;
}

export interface ScrambleScoreResult {
  finalScore: number;
  xpEarned: number;
}

export function computeScrambleScore(p: ScrambleScoreParams): ScrambleScoreResult {
  if (!p.isCorrect) {
    return { finalScore: 0, xpEarned: 0 };
  }
  const score = p.usedHint ? 80 : 100;
  let xp = Math.round(MODE_BASE_XP[p.mode] * MODE_XP_MULTIPLIER[p.mode]);
  if (p.timeSpentSec / p.timeLimitSec <= SPEED_BONUS_THRESHOLD) {
    xp = Math.round(xp * SPEED_BONUS_MULTIPLIER);
  }
  if (p.usedHint) {
    xp = Math.round(xp * HINT_PENALTY_MULTIPLIER);
  }
  return { finalScore: score, xpEarned: Math.max(1, Math.round(xp * p.streakMultiplier)) };
}

export const MAX_ATTEMPTS_BY_MODE: Readonly<Record<ScrambleMode, number>> = { EASY: 2, MEDIUM: 2, HARD: 2, EXPERT: 1 };

export function resolvePracticeMode(level: Level): ScrambleMode {
  if (!isGuidedLevel(level)) return 'EXPERT';
  return level === 'A1' || level === 'A1_PLUS' ? 'EASY' : 'MEDIUM';
}