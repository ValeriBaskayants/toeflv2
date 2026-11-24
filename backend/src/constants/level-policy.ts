import type { Level } from '@prisma/client';

const GUIDED_LEVELS: ReadonlySet<Level> = new Set(['A1', 'A1_PLUS', 'A2', 'A2_PLUS']);
const ALL_LEVELS: readonly Level[] = ['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'B2_PLUS', 'C1', 'C2'];

export const EXAM_LEVEL_RANGE: readonly Level[] = ALL_LEVELS.filter((l) => !GUIDED_LEVELS.has(l));

export interface ExamModePolicy {
  rate: number;
  maxPlays: number;
}

const GUIDED_POLICY: Readonly<Partial<Record<Level, ExamModePolicy>>> = {
  A1: { rate: 0.70, maxPlays: 3 },
  A1_PLUS: { rate: 0.78, maxPlays: 3 },
  A2: { rate: 0.85, maxPlays: 2 },
  A2_PLUS: { rate: 0.92, maxPlays: 2 },
};

export function isGuidedLevel(level: Level): boolean {
  return GUIDED_LEVELS.has(level);
}

export function resolvePracticePolicy(level: Level, authoredRate: number): ExamModePolicy {
  if (isGuidedLevel(level)) {
    const policy = GUIDED_POLICY[level];
    return policy ?? { rate: authoredRate, maxPlays: 1 };
  }
  return { rate: authoredRate, maxPlays: 1 };
}