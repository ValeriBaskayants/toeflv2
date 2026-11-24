export const REQUIRED_SENTENCE_COUNT = 5;
export const MAX_WORDS_PER_SENTENCE = 15;
export const PENCIL_PROTOCOL_PAUSE_SEC = 60;

export const BANNED_CONJUNCTIONS = ['and', 'but', 'so', 'because', 'then'] as const;
export const BANNED_ABBREVIATIONS = ['etc', 'etc.'] as const;

export interface HardConstraintViolation {
  rule: 'SENTENCE_COUNT' | 'WORD_LIMIT' | 'BANNED_WORD';
  message: string;
  sentenceIndex?: number;
}

export function checkHardConstraints(sentences: string[]): HardConstraintViolation[] {
  const violations: HardConstraintViolation[] = [];

  if (sentences.length !== REQUIRED_SENTENCE_COUNT) {
    violations.push({
      rule: 'SENTENCE_COUNT',
      message: `Exactly ${REQUIRED_SENTENCE_COUNT} sentences required, got ${sentences.length}.`,
    });
  }

  sentences.forEach((s, idx) => {
    const words = s.trim().split(/\s+/).filter(Boolean);
    if (words.length > MAX_WORDS_PER_SENTENCE) {
      violations.push({
        rule: 'WORD_LIMIT',
        message: `Sentence ${idx + 1} has ${words.length} words (max ${MAX_WORDS_PER_SENTENCE}).`,
        sentenceIndex: idx,
      });
    }

    const lower = s.toLowerCase();
    for (const banned of [...BANNED_CONJUNCTIONS, ...BANNED_ABBREVIATIONS]) {
      const regex = new RegExp(`\\b${banned.replace('.', '\\.')}\\b`, 'i');
      if (regex.test(lower)) {
        violations.push({
          rule: 'BANNED_WORD',
          message: `Sentence ${idx + 1} uses banned word "${banned}" — use a C1/C2 connector instead (furthermore, nevertheless, consequently, therefore).`,
          sentenceIndex: idx,
        });
      }
    }
  });

  return violations;
}