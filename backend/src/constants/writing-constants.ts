import type { Level, WritingType } from '@prisma/client';
import { isGuidedLevel } from './level-policy';

export interface WritingTaskPolicy {
  minWords: number;
  maxWords: number;
  timeLimitSec: number;
}

// ETS gives no official Email word-count range ("write as much as you can").
// Discussion minWords=100 is ETS's own stated minimum. Neither maxWords is a hard submit block.
export const EMAIL_STRICT_POLICY: WritingTaskPolicy = { minWords: 80, maxWords: 140, timeLimitSec: 420 };
export const DISCUSSION_STRICT_POLICY: WritingTaskPolicy = { minWords: 100, maxWords: 180, timeLimitSec: 600 };

export type ScoredWritingType = Extract<WritingType, 'EMAIL' | 'ACADEMIC_DISCUSSION'>;

// Guided-зона (A1–A2+): цифры — константы, не поля промпта. Админ больше не должен
// помнить, что проставлять при заливке контента для лёгких уровней.
// Это наша собственная педагогическая прогрессия к строгим цифрам выше (не из ETS —
// реальный TOEFL на этих уровнях всё равно не сдают), ступенчато нарастающая к B1.
export const GUIDED_WRITING_POLICY: Readonly<Partial<Record<Level, Record<ScoredWritingType, WritingTaskPolicy>>>> = {
  A1: {
    EMAIL: { minWords: 25, maxWords: 50, timeLimitSec: 300 },
    ACADEMIC_DISCUSSION: { minWords: 30, maxWords: 60, timeLimitSec: 360 },
  },
  A1_PLUS: {
    EMAIL: { minWords: 35, maxWords: 65, timeLimitSec: 330 },
    ACADEMIC_DISCUSSION: { minWords: 40, maxWords: 75, timeLimitSec: 420 },
  },
  A2: {
    EMAIL: { minWords: 50, maxWords: 85, timeLimitSec: 360 },
    ACADEMIC_DISCUSSION: { minWords: 55, maxWords: 95, timeLimitSec: 480 },
  },
  A2_PLUS: {
    EMAIL: { minWords: 65, maxWords: 105, timeLimitSec: 390 },
    ACADEMIC_DISCUSSION: { minWords: 75, maxWords: 130, timeLimitSec: 540 },
  },
};

export function resolveWritingPolicy(
  level: Level,
  type: ScoredWritingType,
  authored: WritingTaskPolicy,
): WritingTaskPolicy {
  if (!isGuidedLevel(level)) {
    return type === 'EMAIL' ? EMAIL_STRICT_POLICY : DISCUSSION_STRICT_POLICY;
  }
  // authored остаётся safety-net на случай, если уровень вдруг не описан в таблице.
  return GUIDED_WRITING_POLICY[level]?.[type] ?? authored;
}

export const MAX_COUNTED_ATTEMPTS_BY_ZONE = { guided: 3, strict: 1 } as const;

export function resolveMaxCountedAttempts(level: Level): number {
  return isGuidedLevel(level) ? MAX_COUNTED_ATTEMPTS_BY_ZONE.guided : MAX_COUNTED_ATTEMPTS_BY_ZONE.strict;
}

export const WRITING_TIME_GRACE_SEC = 20;
export const MIN_RESUBMIT_INTERVAL_MS = 5 * 60 * 1000;