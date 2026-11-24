import {
  ACADEMIC_PASSAGE_QUESTIONS, ACADEMIC_WORD_RANGE, DAILY_LIFE_MAX_QUESTIONS, DAILY_LIFE_MIN_QUESTIONS,
  DAILY_LIFE_WORD_RANGE, MC_OPTIONS_COUNT, OFFICIAL_ACADEMIC_QUESTION_TYPES, type WordRange,
} from '../../constants/reading-toefl-constants';
import { countWords } from './c-test.util';



export interface McQuestionInput {
  options?: string[];
  correctIndex?: number;
}

export interface DailyLifeInput {
  text: string;
  questions: Array<{ options: string[]; correctIndex: number }>;
}

export interface AcademicInput {
  passage: string;
  questions: Array<{ type: string } & McQuestionInput>;
}

function checkWordRange(label: string, text: string, range: WordRange): string[] {
  const words = countWords(text);
  return words < range.min || words > range.max ? [`${label} has ${words} words, expected ${range.min}-${range.max}`] : [];
}

function checkMcQuestion(label: string, q: McQuestionInput): string[] {
  const problems: string[] = [];
  const options = q.options ?? [];

  if (options.length !== MC_OPTIONS_COUNT) {
    problems.push(`${label}: needs exactly ${MC_OPTIONS_COUNT} options, got ${options.length}`);
  }
  if (options.some((o) => o.trim().length === 0)) {
    problems.push(`${label}: empty option`);
  }
  if (new Set(options.map((o) => o.trim().toLowerCase())).size !== options.length) {
    problems.push(`${label}: duplicate options`);
  }
  if (q.correctIndex === undefined || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length) {
    problems.push(`${label}: correctIndex ${String(q.correctIndex)} is out of range`);
  }

  return problems;
}

export function validateDailyLife(item: DailyLifeInput): string[] {
  const problems = checkWordRange('text', item.text, DAILY_LIFE_WORD_RANGE);

  if (item.questions.length < DAILY_LIFE_MIN_QUESTIONS || item.questions.length > DAILY_LIFE_MAX_QUESTIONS) {
    problems.push(`needs ${DAILY_LIFE_MIN_QUESTIONS}-${DAILY_LIFE_MAX_QUESTIONS} questions, got ${item.questions.length}`);
  }
  item.questions.forEach((q, i) => problems.push(...checkMcQuestion(`question ${i + 1}`, q)));

  return problems;
}

export function validateAcademicPassage(item: AcademicInput): string[] {
  const problems = checkWordRange('passage', item.passage, ACADEMIC_WORD_RANGE);

  if (item.questions.length !== ACADEMIC_PASSAGE_QUESTIONS) {
    problems.push(`needs exactly ${ACADEMIC_PASSAGE_QUESTIONS} questions, got ${item.questions.length}`);
  }
  item.questions.forEach((q, i) => {
    if (!OFFICIAL_ACADEMIC_QUESTION_TYPES.includes(q.type)) {
      problems.push(`question ${i + 1}: type ${q.type} is not part of the 2026 TOEFL iBT spec`);
      return;
    }
    problems.push(...checkMcQuestion(`question ${i + 1}`, q));
  });

  return problems;
}