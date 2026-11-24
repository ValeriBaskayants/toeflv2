// Official ETS rule: after an intact first sentence the second half of every second word is deleted; 10 words.
// Verified on all 10 words of the official ETS sample: visible = floor(n/2), hidden = ceil(n/2).
// ASSUMPTIONS (not published by ETS): word #1 after the first sentence is intact, #2 damaged, ...;
// one-letter words are not counted; after the N-th damaged word the rest stays intact.

export const DEFAULT_C_TEST_BLANK_COUNT = 10;

export interface CTestBlank {
  index: number;
  fullWord: string;
  visiblePrefix: string;
}

export interface CTestTextSegment {
  kind: 'text';
  value: string;
}

export interface CTestBlankSegment {
  kind: 'blank';
  index: number;
  visiblePrefix: string;
  hiddenLength: number;
}

export type CTestSegment = CTestTextSegment | CTestBlankSegment;

export interface CTestBuildResult {
  blanks: CTestBlank[];
  /** Safe to send to the client: contains no hidden letters. */
  segments: CTestSegment[];
  wordCount: number;
}

export class CTestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CTestError';
  }
}

const FIRST_SENTENCE_RE = /^[\s\S]*?[.!?](?=\s|$)/;
const TOKEN_RE = /[A-Za-z0-9]+(?:['’.,-][A-Za-z0-9]+)*|[^A-Za-z0-9]+/g;
const PLAIN_LETTERS_RE = /^[A-Za-z]+$/;
const WORD_START_RE = /^[A-Za-z0-9]/;

export function visibleLengthOf(word: string): number {
  return Math.floor(word.length / 2);
}

export function hiddenSuffixOf(blank: CTestBlank): string {
  return blank.fullWord.slice(blank.visiblePrefix.length);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export function buildCTest(fullText: string, blankCount: number = DEFAULT_C_TEST_BLANK_COUNT): CTestBuildResult {
  const text = fullText.trim();
  const firstSentenceMatch = FIRST_SENTENCE_RE.exec(text);

  if (firstSentenceMatch === null) {
    throw new CTestError('Text must contain a first sentence ending with . ! or ?');
  }

  const firstSentence = firstSentenceMatch[0];
  const tokens = text.slice(firstSentence.length).match(TOKEN_RE) ?? [];

  const segments: CTestSegment[] = [];
  const blanks: CTestBlank[] = [];
  let buffer = firstSentence;
  let wordsSeen = 0;

  for (const token of tokens) {
    const isCountable = WORD_START_RE.test(token) && token.length >= 2;

    if (isCountable) {
      wordsSeen++;
    }

    const isDamaged = isCountable && wordsSeen % 2 === 0 && blanks.length < blankCount;

    if (!isDamaged) {
      buffer += token;
      continue;
    }

    if (!PLAIN_LETTERS_RE.test(token)) {
      throw new CTestError(`Word "${token}" sits at a damaged position but is not plain letters; rephrase the text`);
    }

    const visiblePrefix = token.slice(0, visibleLengthOf(token));
    const index = blanks.length;

    if (buffer.length > 0) {
      segments.push({ kind: 'text', value: buffer });
      buffer = '';
    }

    blanks.push({ index, fullWord: token, visiblePrefix });
    segments.push({ kind: 'blank', index, visiblePrefix, hiddenLength: token.length - visiblePrefix.length });
  }

  if (buffer.length > 0) {
    segments.push({ kind: 'text', value: buffer });
  }

  if (blanks.length !== blankCount) {
    throw new CTestError(`Text yields ${blanks.length} blanks, expected ${blankCount}; make the text longer`);
  }

  return { blanks, segments, wordCount: countWords(text) };
}

/** True when author-supplied blanks equal the blanks derived from the text by the official rule. */
export function blanksMatch(derived: CTestBlank[], supplied: CTestBlank[]): boolean {
  if (derived.length !== supplied.length) {
    return false;
  }

  const bySuppliedIndex = new Map(supplied.map((b) => [b.index, b]));

  return derived.every((d) => {
    const s = bySuppliedIndex.get(d.index);
    return s !== undefined && s.fullWord === d.fullWord && s.visiblePrefix === d.visiblePrefix;
  });
}