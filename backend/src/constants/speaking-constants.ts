

export interface PronunciationRawScores {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
}





const WEIGHTS = {
  accuracy: 0.35,
  fluency: 0.25,
  completeness: 0.30,
  prosody: 0.10,
} as const;

export function computeItemScore(raw: PronunciationRawScores): number {
  const prosody = raw.prosodyScore ?? raw.fluencyScore; 

  const composite100 =
    raw.accuracyScore * WEIGHTS.accuracy +
    raw.fluencyScore * WEIGHTS.fluency +
    raw.completenessScore * WEIGHTS.completeness +
    prosody * WEIGHTS.prosody;

  
  return Math.round((composite100 / 100) * 5 * 10) / 10; 
}

export function computeTaskScore(itemScores: number[]): number {
  if (itemScores.length === 0) return 0;
  const avg = itemScores.reduce((s, v) => s + v, 0) / itemScores.length;
  return Math.round(avg * 10) / 10;
}



export const DIFFICULTY_ORDER = ['SHORT', 'SHORT', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'LONG', 'LONG'] as const;


export const RESPONSE_WINDOW_SEC = 10; 
export const PAUSE_BEFORE_BEEP_MS = 600; 
export const BEEP_DURATION_MS = 300;