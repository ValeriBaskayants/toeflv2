


import { ScrambleMode } from '@prisma/client';





export const MODE_TIME_LIMITS: Record<ScrambleMode, number> = {
  EASY:   60,
  MEDIUM: 45,
  HARD:   30,
  EXPERT: 25,
};


export const EXTRA_SEC_PER_WORD = 3;

export function calcTimeLimit(mode: ScrambleMode, wordCount: number): number {
  const base = MODE_TIME_LIMITS[mode];
  const extra = Math.max(0, wordCount - 5) * EXTRA_SEC_PER_WORD;
  return base + extra;
}



export const MODE_BASE_XP: Record<ScrambleMode, number> = {
  EASY:   8,
  MEDIUM: 12,
  HARD:   18,
  EXPERT: 25,
};

export const MODE_XP_MULTIPLIER: Record<ScrambleMode, number> = {
  EASY:   0.7,
  MEDIUM: 1.0,
  HARD:   1.3,
  EXPERT: 1.6,
};


export const SPEED_BONUS_THRESHOLD = 0.5; 
export const SPEED_BONUS_MULTIPLIER = 1.2;


export const HINT_PENALTY_MULTIPLIER = 0.7;



export const MODE_DISTRACTOR_COUNT: Record<ScrambleMode, number> = {
  EASY:   0,
  MEDIUM: 2,
  HARD:   4,
  EXPERT: 4, 
};



export interface ScrambleScoreParams {
  isCorrect: boolean;
  mode: ScrambleMode;
  timeSpentSec: number;
  timeLimitSec: number;
  usedHint: boolean;
  streak: number;
}

export interface ScrambleScoreResult {
  finalScore: number; 
  xpEarned: number;
}

export function computeScrambleScore(p: ScrambleScoreParams): ScrambleScoreResult {
  if (!p.isCorrect) {
    return { finalScore: 0, xpEarned: 0 };
  }

  
  let score = 100;

  
  if (p.usedHint) score = Math.round(score * 0.8);

  
  const baseXP = MODE_BASE_XP[p.mode];
  let xp = Math.round(baseXP * MODE_XP_MULTIPLIER[p.mode]);

  
  const timeRatio = p.timeSpentSec / p.timeLimitSec;
  if (timeRatio <= SPEED_BONUS_THRESHOLD) {
    xp = Math.round(xp * SPEED_BONUS_MULTIPLIER);
  }

  
  if (p.usedHint) xp = Math.round(xp * HINT_PENALTY_MULTIPLIER);

  
  const streakMult = p.streak >= 7 ? 2.0 : p.streak >= 3 ? 1.5 : p.streak >= 1 ? 1.2 : 1.0;
  xp = Math.round(xp * streakMult);

  return { finalScore: score, xpEarned: Math.max(1, xp) };
}