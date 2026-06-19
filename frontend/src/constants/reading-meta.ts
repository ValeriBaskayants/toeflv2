import type { ReadingUserStatus } from '@/types/reading/Reading.types';

// Объединяем цвета и лейблы в одну удобную мапу
export const LEVEL_CONFIG: Record<string, { color: string; label: string }> = {
  A1:      { color: '#10b981', label: 'A1' },
  A1_PLUS: { color: '#059669', label: 'A1+' },
  A2:      { color: '#14b8a6', label: 'A2' },
  A2_PLUS: { color: '#0d9488', label: 'A2+' },
  B1:      { color: '#3b82f6', label: 'B1' },
  B1_PLUS: { color: '#2563eb', label: 'B1+' },
  B2:      { color: '#8b5cf6', label: 'B2' },
  B2_PLUS: { color: '#7c3aed', label: 'B2+' },
  C1:      { color: '#f59e0b', label: 'C1' },
  C2:      { color: '#ef4444', label: 'C2' },
};

export function getLevelConfig(level: string) {
  return LEVEL_CONFIG[level] ?? { color: 'var(--accent)', label: level };
}

// Выносим стили бейджей статусов (теперь они используют CSS-переменные из globals)
export const STATUS_CONFIG: Record<ReadingUserStatus, { color: string; bg: string; labelKey: string }> = {
  not_started: { color: 'var(--text-3)', bg: 'var(--surface-3)', labelKey: 'not_started' },
  attempted:   { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.12)', labelKey: 'attempted' },
  completed:   { color: 'var(--success)', bg: 'var(--success-light)', labelKey: 'completed' },
};