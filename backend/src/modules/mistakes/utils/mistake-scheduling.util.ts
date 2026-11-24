import type { MasteryStatus } from '@prisma/client';

export const INITIAL_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const MAX_TAGS = 20;

export interface SchedulingState {
  easeFactor: number;
  status: MasteryStatus;
  nextReview: Date | null;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function firstMistakeState(now: Date): SchedulingState {
  return { easeFactor: INITIAL_EASE, status: 'LEARNING', nextReview: addDays(now, 1) };
}

export function nextMistakeState(current: SchedulingState, isCorrect: boolean, now: Date): SchedulingState {
  if (!isCorrect) {
    return { easeFactor: Math.max(MIN_EASE, current.easeFactor - 0.2), status: 'LEARNING', nextReview: addDays(now, 1) };
  }

  const isDue = current.nextReview === null || current.nextReview <= now;
  if (!isDue) {
    return current;
  }

  const easeFactor = Math.min(MAX_EASE, current.easeFactor + 0.1);
  const status: MasteryStatus = current.status === 'LEARNING' ? 'REVIEWING' : 'MASTERED';
  return { easeFactor, status, nextReview: status === 'MASTERED' ? null : addDays(now, Math.round(easeFactor * 2)) };
}

export function mergeTags(existing: string[], incoming: string[] | undefined): string[] {
  return [...new Set([...existing, ...(incoming ?? [])])].slice(0, MAX_TAGS);
}

export function clip(text: string, max = 300): string {
  return text.length > max ? text.slice(0, max) : text;
}