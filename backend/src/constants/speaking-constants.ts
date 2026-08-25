export interface PronunciationRawScores {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  repetitionAccuracy: number;
}

const WEIGHTS = {
  accuracy: 0.3,
  fluency: 0.2,
  completeness: 0.2,
  prosody: 0.1,
  repetition: 0.2,
} as const;

export function computeItemScore(raw: PronunciationRawScores): number {
  const prosody = raw.prosodyScore ?? raw.fluencyScore;

  const composite100 =
    raw.accuracyScore * WEIGHTS.accuracy +
    raw.fluencyScore * WEIGHTS.fluency +
    raw.completenessScore * WEIGHTS.completeness +
    prosody * WEIGHTS.prosody +
    raw.repetitionAccuracy * WEIGHTS.repetition;

  return Math.round((composite100 / 100) * 5 * 10) / 10;
}

export function computeTaskScore(itemScores: number[]): number {
  if (itemScores.length === 0) return 0;
  const avg = itemScores.reduce((s, v) => s + v, 0) / itemScores.length;
  return Math.round(avg * 10) / 10;
}

export function computeRepetitionAccuracy(reference: string, recognized: string): number {
  const refWords = reference.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const gotWords = recognized.toLowerCase().trim().split(/\s+/).filter(Boolean);

  if (refWords.length === 0) return 0;

  const matched = refWords.filter((w, i) => gotWords[i] === w).length;
  return Math.round((matched / refWords.length) * 100);
}

export const MIN_ITEMS_PER_SET = 3;
export const MAX_ITEMS_PER_SET = 12;

export const RECORDING_WINDOW_BY_DIFFICULTY = {
  SHORT: 8,
  MEDIUM: 10,
  LONG: 12,
} as const;

export const DIFFICULTY_ORDER = ['SHORT', 'SHORT', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'LONG', 'LONG'] as const;

export const RESPONSE_WINDOW_SEC = 10;
export const PAUSE_BEFORE_BEEP_MS = 600;
export const BEEP_DURATION_MS = 300;
