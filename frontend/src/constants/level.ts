const LEVEL_COLOR: Record<string, string> = {
  A1: '#22c55e',
  A1_PLUS: '#16a34a',
  A2: '#14b8a6',
  A2_PLUS: '#0d9488',
  B1: '#3b82f6',
  B1_PLUS: '#2563eb',
  B2: '#8b5cf6',
  B2_PLUS: '#7c3aed',
  C1: '#f59e0b',
  C2: '#ef4444',
};

export const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1',
  A1_PLUS: 'A1+',
  A2: 'A2',
  A2_PLUS: 'A2+',
  B1: 'B1',
  B1_PLUS: 'B1+',
  B2: 'B2',
  B2_PLUS: 'B2+',
  C1: 'C1',
  C2: 'C2',
};

export function getLevelColor(level: string): string {
  return LEVEL_COLOR[level] ?? '#6366f1';
}
