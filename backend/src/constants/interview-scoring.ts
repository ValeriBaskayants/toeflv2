import { MAX_ITEM_SCORE } from './speaking-constants';





export interface InterviewScoringInput {
  recognizedText: string;
  durationSec: number; 
  azureFluencyScore: number; 
  azureAccuracyScore: number; 
  grammarIssueCount: number | null; 
}

export interface InterviewScoringResult {
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  vocabularyDiversity: number; 
  fluencyScore: number;
  intelligibilityScore: number;
  languageUseScore: number;
  organizationScore: number;
  estimatedScore: number; 
}

const PACE_FLOOR_WPM = 40;
const PACE_COMFORT_MIN_WPM = 100;
const PACE_COMFORT_MAX_WPM = 180;
const PACE_RUSH_MIN_SCORE = 60;

const AZURE_FLUENCY_WEIGHT = 0.6; 
const FILLER_PENALTY_PER_PERCENT = 1.5;
const FILLER_PENALTY_MAX = 15;

const TARGET_WORDS_FULL_RESPONSE = 70; 
const GUIRAUD_REFERENCE = 6.5;
const AVG_WORD_LENGTH_FLOOR = 3.5;
const AVG_WORD_LENGTH_CEIL = 5.0;
const GRAMMAR_SENSITIVITY = 3;
const GRAMMAR_WEIGHT = 0.55; 
const DIVERSITY_WEIGHT = 0.7; 

const CONNECTOR_TARGET_COUNT = 3;

const BAND_CUTPOINTS = [88, 74, 58, 40, 20] as const; 

const FILLER_TOKENS: ReadonlySet<string> = new Set(['um', 'uh', 'er', 'erm', 'ah', 'hmm', 'mm']);
const FILLER_PHRASES: readonly RegExp[] = [/\byou know\b/gi, /\bi mean\b/gi];

const CONNECTOR_PATTERNS: readonly RegExp[] = [
  'because', 'since', 'so', 'for example', 'for instance', 'such as', 'first', 'second', 'finally',
  'however', 'but', 'also', 'in addition', 'therefore', 'although', 'on the other hand', 'overall',
  'in conclusion', 'as a result', 'that is why', 'another reason', 'one reason',
].map((c) => new RegExp(`\\b${c}\\b`, 'i'));

const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value));

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function paceScore(wpm: number): number {
  if (wpm <= PACE_FLOOR_WPM) return 0;
  if (wpm < PACE_COMFORT_MIN_WPM) return ((wpm - PACE_FLOOR_WPM) / (PACE_COMFORT_MIN_WPM - PACE_FLOOR_WPM)) * 100;
  if (wpm <= PACE_COMFORT_MAX_WPM) return 100;
  return Math.max(PACE_RUSH_MIN_SCORE, 100 - (wpm - PACE_COMFORT_MAX_WPM));
}

function countFillers(text: string, tokens: string[]): number {
  const single = tokens.filter((t) => FILLER_TOKENS.has(t)).length;
  const phrases = FILLER_PHRASES.reduce((sum, re) => sum + (text.match(re)?.length ?? 0), 0);
  return single + phrases;
}


function developmentCap(wordCount: number): number {
  if (wordCount < 8) return 1;
  if (wordCount < 20) return 2;
  if (wordCount < 35) return 3;
  return MAX_ITEM_SCORE;
}

function bandFromComposite(composite: number): number {
  const idx = BAND_CUTPOINTS.findIndex((cut) => composite >= cut);
  return idx === -1 ? 0 : MAX_ITEM_SCORE - idx;
}

export function buildEmptyInterviewResult(durationSec: number): InterviewScoringResult & { durationSec: number } {
  return {
    durationSec,
    wordCount: 0,
    wordsPerMinute: 0,
    fillerWordCount: 0,
    vocabularyDiversity: 0,
    fluencyScore: 0,
    intelligibilityScore: 0,
    languageUseScore: 0,
    organizationScore: 0,
    estimatedScore: 0,
  };
}

export function computeInterviewItemScore(input: InterviewScoringInput): InterviewScoringResult {
  const tokens = tokenize(input.recognizedText);
  const wordCount = tokens.length;
  if (wordCount === 0) return buildEmptyInterviewResult(input.durationSec);

  const durationSec = Math.max(1, input.durationSec);
  const wordsPerMinute = wordCount / (durationSec / 60);
  const fillerWordCount = countFillers(input.recognizedText, tokens);

  
  const fillerPenalty = Math.min(FILLER_PENALTY_MAX, (fillerWordCount / wordCount) * 100 * FILLER_PENALTY_PER_PERCENT);
  const fluencyScore = clamp(
    AZURE_FLUENCY_WEIGHT * input.azureFluencyScore + (1 - AZURE_FLUENCY_WEIGHT) * paceScore(wordsPerMinute) - fillerPenalty,
  );

  
  const intelligibilityScore = clamp(input.azureAccuracyScore);

  
  const uniqueCount = new Set(tokens).size;
  const guiraud = uniqueCount / Math.sqrt(wordCount);
  const avgWordLength = tokens.reduce((sum, t) => sum + t.length, 0) / wordCount;
  const diversity = clamp((guiraud / GUIRAUD_REFERENCE) * 100);
  const sophistication = clamp(((avgWordLength - AVG_WORD_LENGTH_FLOOR) / (AVG_WORD_LENGTH_CEIL - AVG_WORD_LENGTH_FLOOR)) * 100);
  const lexical = DIVERSITY_WEIGHT * diversity + (1 - DIVERSITY_WEIGHT) * sophistication;

  const languageUseScore =
    input.grammarIssueCount === null
      ? clamp(lexical)
      : clamp(
          GRAMMAR_WEIGHT * Math.max(0, 100 * Math.pow(1 - Math.min(1, input.grammarIssueCount / wordCount), GRAMMAR_SENSITIVITY)) +
            (1 - GRAMMAR_WEIGHT) * lexical,
        );

  
  const connectorsUsed = CONNECTOR_PATTERNS.filter((re) => re.test(input.recognizedText)).length;
  const coherence = clamp((connectorsUsed / CONNECTOR_TARGET_COUNT) * 100);
  const development = clamp((wordCount / TARGET_WORDS_FULL_RESPONSE) * 100);
  const organizationScore = clamp(0.5 * coherence + 0.5 * development);

  const composite = (fluencyScore + intelligibilityScore + languageUseScore + organizationScore) / 4;
  const estimatedScore = Math.min(bandFromComposite(composite), developmentCap(wordCount));

  return {
    wordCount,
    wordsPerMinute: Math.round(wordsPerMinute * 10) / 10,
    fillerWordCount,
    vocabularyDiversity: Math.round((uniqueCount / wordCount) * 100) / 100,
    fluencyScore: Math.round(fluencyScore),
    intelligibilityScore: Math.round(intelligibilityScore),
    languageUseScore: Math.round(languageUseScore),
    organizationScore: Math.round(organizationScore),
    estimatedScore,
  };
}