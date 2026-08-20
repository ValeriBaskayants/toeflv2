import type { Level } from '@/types/globalTypes';

export type HintPolicy = 'always' | 'reveal-on-check' | 'on-demand';

const ALWAYS_LEVELS: Level[] = ['A1', 'A1_PLUS', 'A2'] as Level[];
const REVEAL_ON_CHECK_LEVELS: Level[] = ['A2_PLUS', 'B1', 'B1_PLUS', 'B2'] as Level[];

export const HINT_AUTO_HIDE_MS = 5000;

export function getHintPolicy(level: Level): HintPolicy {
  if (ALWAYS_LEVELS.includes(level)) return 'always';
  if (REVEAL_ON_CHECK_LEVELS.includes(level)) return 'reveal-on-check';
  return 'on-demand';
}