import { MASTERY_ACCURACY_THRESHOLD } from '../../constants/level-requirements';
import { computeSpacedWeight, weightedPickOne, type SelectionCandidate } from './spaced-selection.util';

export interface PickableTask {
  id: string;
  lastScore: number | null;
  lastAttemptAt: Date | null;
}

/** Spaced pick for "TOEFL experience". When every task was attempted moments ago all weights are 0 -> serve the least recently attempted one instead of failing. */
export function pickTaskForToeflMode(tasks: PickableTask[]): string | null {
  if (tasks.length === 0) {
    return null;
  }

  const weighted = tasks.map((t) => {
    const candidate: SelectionCandidate = { id: t.id };
    if (t.lastAttemptAt !== null && t.lastScore !== null) {
      candidate.lastAttemptAt = t.lastAttemptAt;
      candidate.lastOutcome = t.lastScore >= MASTERY_ACCURACY_THRESHOLD ? 'correct' : 'incorrect';
    }
    return { id: t.id, weight: computeSpacedWeight(candidate) };
  });

  const picked = weightedPickOne(weighted);
  if (picked !== null) {
    return picked.id;
  }

  const oldestFirst = [...tasks].sort((a, b) => (a.lastAttemptAt?.getTime() ?? 0) - (b.lastAttemptAt?.getTime() ?? 0));
  return oldestFirst[0]?.id ?? null;
}

export interface CompletedSessionRow {
  taskId: string;
  finalScore: number | null;
  completedAt: Date | null;
}

/** `sessionsNewestFirst` must be ordered by completedAt desc: only the latest attempt per task matters. */
export function toPickableTasks(taskIds: string[], sessionsNewestFirst: CompletedSessionRow[]): PickableTask[] {
  const lastByTask = new Map<string, CompletedSessionRow>();
  for (const s of sessionsNewestFirst) {
    if (!lastByTask.has(s.taskId)) {
      lastByTask.set(s.taskId, s);
    }
  }

  return taskIds.map((id) => {
    const last = lastByTask.get(id);
    return { id, lastScore: last?.finalScore ?? null, lastAttemptAt: last?.completedAt ?? null };
  });
}

export type TaskUserStatus = 'new' | 'attempted' | 'mastered';

export interface TaskListMeta {
  isBookmarked: boolean;
  attempts: number;
  bestScore: number | null;
  userStatus: TaskUserStatus;
}

export interface ScoredSessionRow {
  taskId: string;
  finalScore: number | null;
}

/** Adds the bookmark flag and the user's own history to a task list (one query each, no N+1). */
export function withTaskListMeta<T extends { id: string }>(
  tasks: T[],
  completedSessions: ScoredSessionRow[],
  bookmarkedIds: Set<string>,
): Array<T & TaskListMeta> {
  const byTask = new Map<string, { attempts: number; best: number }>();
  for (const s of completedSessions) {
    const prev = byTask.get(s.taskId) ?? { attempts: 0, best: 0 };
    byTask.set(s.taskId, { attempts: prev.attempts + 1, best: Math.max(prev.best, s.finalScore ?? 0) });
  }

  return tasks.map((t) => {
    const h = byTask.get(t.id);
    const userStatus: TaskUserStatus = h === undefined ? 'new' : h.best >= MASTERY_ACCURACY_THRESHOLD ? 'mastered' : 'attempted';
    return { ...t, isBookmarked: bookmarkedIds.has(t.id), attempts: h?.attempts ?? 0, bestScore: h?.best ?? null, userStatus };
  });
}