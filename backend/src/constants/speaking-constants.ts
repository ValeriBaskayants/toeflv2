import type { SpeakingDifficulty } from '@prisma/client';

export const MAX_ITEM_SCORE = 5;

export const ITEM_PASS_SCORE = 4;

export const TOEFL_PICK_MASTERY_PERCENT = 70;


export const MIN_ITEMS_PER_SET = 3;
export const MAX_ITEMS_PER_SET = 12;
export const EXAM_MODE_ITEM_COUNT = 7; 
export const EXAM_MODE_MAX_POINTS = EXAM_MODE_ITEM_COUNT * MAX_ITEM_SCORE;


export const RECORDING_WINDOW_BY_DIFFICULTY: Readonly<Record<SpeakingDifficulty, number>> = {
  SHORT: 8,
  MEDIUM: 10,
  LONG: 12,
};

const DIFFICULTY_RANK: Readonly<Record<SpeakingDifficulty, number>> = { SHORT: 0, MEDIUM: 1, LONG: 2 };


export function isNonDecreasingDifficulty(difficulties: readonly SpeakingDifficulty[]): boolean {
  for (let i = 1; i < difficulties.length; i++) {
    if (DIFFICULTY_RANK[difficulties[i]!] < DIFFICULTY_RANK[difficulties[i - 1]!]) return false;
  }
  return true;
}


export interface TaskAudioTiming {
  pauseBeforeBeepMs: number;
  beepDurationMs: number;
  recordingWindowSec: number;
}



export const LISTEN_REPEAT_PAUSE_BEFORE_BEEP_MS = 400;
export const LISTEN_REPEAT_BEEP_DURATION_MS = 400;

export function getListenRepeatTiming(difficulty: SpeakingDifficulty): TaskAudioTiming {
  return {
    pauseBeforeBeepMs: LISTEN_REPEAT_PAUSE_BEFORE_BEEP_MS,
    beepDurationMs: LISTEN_REPEAT_BEEP_DURATION_MS,
    recordingWindowSec: RECORDING_WINDOW_BY_DIFFICULTY[difficulty],
  };
}


export const INTERVIEW_QUESTION_COUNT = 4;
export const INTERVIEW_TIMING: TaskAudioTiming = {
  pauseBeforeBeepMs: 0,
  beepDurationMs: 0,
  recordingWindowSec: 45,
};


export const RECORDING_GRACE_SEC = 1; 
export const MIN_SPEECH_DURATION_SEC = 0.4; 
export const WAV_BYTES_PER_SECOND = 32_000; 
export const WAV_HEADER_BYTES = 44;


export const MAX_REPEAT_UPLOAD_BYTES = 1 * 1024 * 1024;
export const MAX_INTERVIEW_UPLOAD_BYTES = 2 * 1024 * 1024;

export const ALLOWED_AUDIO_MIME_TYPES = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/mpeg'] as const;


export function normalizeAudioMime(mime: string): string {
  return (mime.split(';')[0] ?? '').trim().toLowerCase();
}

export function isAllowedAudioMime(mime: string): boolean {
  return (ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(normalizeAudioMime(mime));
}


export interface WordErrorSummary {
  omissions: number;
  insertions: number;
  mispronunciations: number;
}

const NO_WORD_ERRORS: WordErrorSummary = { omissions: 0, insertions: 0, mispronunciations: 0 };

export interface PronunciationRawScores {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number | null;
  repetitionAccuracy: number;
  
  wordErrors?: WordErrorSummary;
}

export function summarizeWordErrors(wordScores: ReadonlyArray<{ errorType: string }>): WordErrorSummary {
  const summary: WordErrorSummary = { omissions: 0, insertions: 0, mispronunciations: 0 };
  for (const w of wordScores) {
    if (w.errorType === 'Omission') summary.omissions++;
    else if (w.errorType === 'Insertion') summary.insertions++;
    else if (w.errorType === 'Mispronunciation') summary.mispronunciations++;
  }
  return summary;
}





const BLANK_INTELLIGIBILITY_FLOOR = 20;
const TOP_BAND_MIN_INTELLIGIBILITY = 70;
const TOP_BAND_MIN_FLUENCY = 55;

export function computeItemScore(raw: PronunciationRawScores): number {
  const intelligibility = raw.accuracyScore;
  const errors = raw.wordErrors ?? NO_WORD_ERRORS;

  if (raw.repetitionAccuracy === 0 || intelligibility < BLANK_INTELLIGIBILITY_FLOOR) return 0;

  
  const intelligibilityCap = intelligibility < 40 ? 2 : intelligibility < 60 ? 3 : MAX_ITEM_SCORE;

  const isExactRepetition =
    raw.repetitionAccuracy === 100 &&
    raw.completenessScore >= 99 &&
    errors.omissions === 0 &&
    errors.insertions === 0 &&
    errors.mispronunciations === 0;

  if (isExactRepetition) {
    const fullyIntelligible =
      intelligibility >= TOP_BAND_MIN_INTELLIGIBILITY && raw.fluencyScore >= TOP_BAND_MIN_FLUENCY;
    return Math.min(fullyIntelligible ? MAX_ITEM_SCORE : 4, intelligibilityCap);
  }

  
  const repeatAccuracy = Math.min(raw.repetitionAccuracy, raw.completenessScore);
  const contentBand = repeatAccuracy >= 80 ? 4 : repeatAccuracy >= 60 ? 3 : repeatAccuracy >= 35 ? 2 : 1;
  return Math.min(contentBand, intelligibilityCap);
}

export function computeTaskScore(itemScores: number[]): number {
  if (itemScores.length === 0) return 0;
  const avg = itemScores.reduce((s, v) => s + v, 0) / itemScores.length;
  return Math.round(avg * 10) / 10;
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[-–—]/g, ' ')
    .replace(/[^\p{L}\p{N}'\s]/gu, '')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 0);
}


export function computeRepetitionAccuracy(reference: string, recognized: string): number {
  const ref = normalizeWords(reference);
  const got = normalizeWords(recognized);

  if (ref.length === 0 || got.length === 0) return 0;

  const dp: number[][] = Array.from({ length: ref.length + 1 }, () => new Array<number>(got.length + 1).fill(0));
  for (let i = 0; i <= ref.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= got.length; j++) dp[0]![j] = j;

  for (let i = 1; i <= ref.length; i++) {
    for (let j = 1; j <= got.length; j++) {
      dp[i]![j] =
        ref[i - 1] === got[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }

  const wordErrorRate = Math.min(1, dp[ref.length]![got.length]! / ref.length);
  return Math.round((1 - wordErrorRate) * 100);
}