const FILLER_WORDS = new Set([
  'um', 'uh', 'like', 'basically', 'actually', 'literally', 'sort', 'kind',
]);

export interface InterviewHeuristicInput {
  recognizedText: string;
  durationUsedSec: number;
  windowSec: number;
}

export interface InterviewHeuristicResult {
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  vocabularyDiversity: number;
  estimatedScore: number;
}

function normalizeWords(text: string): string[] {
  return text.toLowerCase().replace(/[.,!?;:"()]/g, '').trim().split(/\s+/).filter(Boolean);
}

export function computeInterviewHeuristic(input: InterviewHeuristicInput): InterviewHeuristicResult {
  const words = normalizeWords(input.recognizedText);
  const wordCount = words.length;

  if (wordCount === 0) {
    return { wordCount: 0, wordsPerMinute: 0, fillerWordCount: 0, vocabularyDiversity: 0, estimatedScore: 0 };
  }

  const minutesUsed = Math.max(input.durationUsedSec, 1) / 60;
  const wordsPerMinute = wordCount / minutesUsed;

  const fillerWordCount = words.filter((w) => FILLER_WORDS.has(w)).length;
  const contentWords = words.filter((w) => !FILLER_WORDS.has(w));
  const uniqueContentWords = new Set(contentWords);
  const vocabularyDiversity = contentWords.length > 0 ? uniqueContentWords.size / contentWords.length : 0;

  const completenessScore = Math.min(1, input.durationUsedSec / (input.windowSec * 0.6));
  const paceScore = wordsPerMinute >= 110 && wordsPerMinute <= 170
    ? 1
    : Math.max(0, 1 - Math.abs(wordsPerMinute - 140) / 140);
  const fillerPenalty = Math.max(0, 1 - (fillerWordCount / wordCount) * 5);
  const diversityScore = Math.min(1, vocabularyDiversity * 1.8);

  const composite = completenessScore * 0.35 + paceScore * 0.25 + fillerPenalty * 0.2 + diversityScore * 0.2;
  const estimatedScore = Math.round(composite * 5 * 10) / 10;

  return {
    wordCount,
    wordsPerMinute: Math.round(wordsPerMinute),
    fillerWordCount,
    vocabularyDiversity: Math.round(vocabularyDiversity * 100) / 100,
    estimatedScore,
  };
}

export const INTERVIEW_QUESTION_COUNT = 4;

// Take an Interview: без паузы и без сигнала — запись стартует сразу по
// окончании аудио вопроса (в отличие от Listen and Repeat).
export interface TaskAudioTiming {
  pauseBeforeBeepMs: number;
  beepDurationMs: number;
  recordingWindowSec: number;
}

export const INTERVIEW_TIMING: TaskAudioTiming = {
  pauseBeforeBeepMs: 0,
  beepDurationMs: 0,
  recordingWindowSec: 45,
};