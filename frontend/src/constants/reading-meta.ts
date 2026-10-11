import type { ReadingUserStatus } from '@/types/reading/Reading.types';
import { LEVEL_DISPLAY, getLevelColor } from './level';

export function getLevelConfig(level: string): { color: string; label: string } {
  return { color: getLevelColor(level), label: LEVEL_DISPLAY[level] ?? level };
}

export const STATUS_CONFIG: Record<ReadingUserStatus, { color: string; bg: string; labelKey: string }> = {
  not_started: { color: 'var(--text-3)', bg: 'var(--surface-3)', labelKey: 'not_started' },
  attempted:   { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.12)', labelKey: 'attempted' },
  completed:   { color: 'var(--success)', bg: 'var(--success-light)', labelKey: 'completed' },
};