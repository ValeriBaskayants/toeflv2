import { Logger } from '@nestjs/common';

const logger = new Logger('InterviewGrammarCheck');
const LANGUAGE_TOOL_URL = 'https://api.languagetool.org/v2/check';
const LANGUAGE_TOOL_TIMEOUT_MS = 8_000;

const LANGUAGE_USE_CATEGORIES: ReadonlySet<string> = new Set(['GRAMMAR', 'CONFUSED_WORDS', 'COLLOCATIONS', 'SEMANTICS']);

interface LanguageToolResponse {
  matches?: Array<{ rule?: { category?: { id?: string } } }>;
}

export async function countGrammarIssues(text: string): Promise<number | null> {
  try {
    const res = await fetch(LANGUAGE_TOOL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, language: 'en-US' }).toString(),
      signal: AbortSignal.timeout(LANGUAGE_TOOL_TIMEOUT_MS),
    });
    if (!res.ok) {
      logger.warn('LANGUAGE_TOOL_BAD_STATUS', { status: res.status });
      return null;
    }
    const data = (await res.json()) as LanguageToolResponse;
    return (data.matches ?? []).filter((m) => LANGUAGE_USE_CATEGORIES.has(m.rule?.category?.id ?? '')).length;
  } catch (err: unknown) {
    logger.warn('LANGUAGE_TOOL_FAILED', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}