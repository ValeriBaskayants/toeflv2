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

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"()]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function computeRepetitionAccuracy(reference: string, recognized: string): number {
  const ref = normalizeWords(reference);
  const got = normalizeWords(recognized);

  if (ref.length === 0) return 0;
  if (got.length === 0) return 0; // тишина/не распознано — 0%, как и должно быть

  const dp: number[][] = Array.from({ length: ref.length + 1 }, () =>
    new Array<number>(got.length + 1).fill(0),
  );

  for (let i = 0; i <= ref.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= got.length; j++) dp[0]![j] = j;

  for (let i = 1; i <= ref.length; i++) {
    for (let j = 1; j <= got.length; j++) {
      if (ref[i - 1] === got[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
      }
    }
  }

  const editDistance = dp[ref.length]![got.length]!;
  const wordErrorRate = Math.min(1, editDistance / ref.length);
  return Math.round((1 - wordErrorRate) * 100);
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

export const EXAM_MODE_ITEM_COUNT = 7;
export const EXAM_MODE_RECORDING_WINDOWS_SEC = [8, 8, 10, 10, 10, 12, 12] as const;
export const EXAM_MODE_MAX_POINTS = 35; // 7 items × 5 max each

export function getExamModeRecordingWindow(positionIndex: number): number {
  return EXAM_MODE_RECORDING_WINDOWS_SEC[
    Math.min(positionIndex, EXAM_MODE_RECORDING_WINDOWS_SEC.length - 1)
  ]!;
}



export interface TaskAudioTiming {
  pauseBeforeBeepMs: number;  
  beepDurationMs: number;      
  recordingWindowSec: number;
}

export const LISTEN_REPEAT_PAUSE_BEFORE_BEEP_MS = 2500;
export const LISTEN_REPEAT_BEEP_DURATION_MS = 400;

export function getListenRepeatTiming(positionIndex: number): TaskAudioTiming {
  return {
    pauseBeforeBeepMs: LISTEN_REPEAT_PAUSE_BEFORE_BEEP_MS,
    beepDurationMs: LISTEN_REPEAT_BEEP_DURATION_MS,
    recordingWindowSec: getExamModeRecordingWindow(positionIndex),
  };
}

export const INTERVIEW_TIMING: TaskAudioTiming = {
  pauseBeforeBeepMs: 0,
  beepDurationMs: 0,
  recordingWindowSec: 45,
};