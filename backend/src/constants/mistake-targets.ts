export const MISTAKE_TASK_PREFIX = {
  COMPLETE_WORDS: 'rcw',
  DAILY_LIFE: 'rdl',
  ACADEMIC_PASSAGE: 'rap',
  BUILD_SENTENCE: 'bas',
} as const;

export type MistakeTaskKind = keyof typeof MISTAKE_TASK_PREFIX;

const KIND_BY_PREFIX = new Map<string, MistakeTaskKind>(
  (Object.entries(MISTAKE_TASK_PREFIX) as Array<[MistakeTaskKind, string]>).map(([kind, prefix]) => [prefix, kind]),
);

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export interface ParsedMistakeTarget {
  kind: MistakeTaskKind;
  taskId: string;
  itemKey: string;
}

export function buildMistakeTargetId(kind: MistakeTaskKind, taskId: string, itemKey: string | number): string {
  return `${MISTAKE_TASK_PREFIX[kind]}:${taskId}:${String(itemKey)}`;
}

/** Returns null for legacy ids (no known prefix) and for malformed ones. */
export function parseMistakeTargetId(targetId: string): ParsedMistakeTarget | null {
  const [prefix, taskId, ...rest] = targetId.split(':');
  const kind = prefix === undefined ? undefined : KIND_BY_PREFIX.get(prefix);

  if (kind === undefined || taskId === undefined || !OBJECT_ID_RE.test(taskId) || rest.length === 0) {
    return null;
  }
  return { kind, taskId, itemKey: rest.join(':') };
}