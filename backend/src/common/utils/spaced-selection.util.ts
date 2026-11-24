export interface SelectionCandidate {
  id: string;
  lastOutcome?: 'correct' | 'incorrect';
  lastAttemptAt?: Date;
}

export interface SpacedSelectionOptions {
  neverAttemptedWeight?: number;
  wrongRampHours?: number;
  wrongBaseWeight?: number;
  masteredCooldownDays?: number;
  masteredBaseWeight?: number;
}

const DEFAULTS: Required<SpacedSelectionOptions> = {
  neverAttemptedWeight: 100,
  wrongRampHours: 4,
  wrongBaseWeight: 70,
  masteredCooldownDays: 14,
  masteredBaseWeight: 15,
};

export function computeSpacedWeight(candidate: SelectionCandidate, opts: SpacedSelectionOptions = {}): number {
  const cfg = { ...DEFAULTS, ...opts };
  if (candidate.lastAttemptAt === undefined) return cfg.neverAttemptedWeight;

  const hoursSince = (Date.now() - candidate.lastAttemptAt.getTime()) / (1000 * 60 * 60);

  if (candidate.lastOutcome === 'incorrect') {
    const ramp = Math.min(1, hoursSince / cfg.wrongRampHours);
    return cfg.wrongBaseWeight * ramp;
  }

  const daysSince = hoursSince / 24;
  const ramp = Math.min(1, daysSince / cfg.masteredCooldownDays);
  return cfg.masteredBaseWeight * ramp;
}

export function weightedPickOne<T extends { id: string; weight: number }>(items: T[]): T | null {
  const pool = items.filter((i) => i.weight > 0);
  if (pool.length === 0) return null;

  const total = pool.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;

  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1]!;
}