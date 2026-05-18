import { Level } from "@prisma/client";

export type AbilityDimension = 'GRAMMAR' | 'VOCABULARY' | 'READING';

export interface DimensionTheta { grammar: number; vocabulary: number; reading: number }
export interface DimensionSE { grammar: number; vocabulary: number; reading: number }



export const GRID_MIN = -4.0;
export const GRID_MAX = 4.0;
export const GRID_STEPS = 161;

export const THETA_GRID: readonly number[] = Object.freeze(
    Array.from(
        { length: GRID_STEPS },
        (_, i) => GRID_MIN + (i * (GRID_MAX - GRID_MIN)) / (GRID_STEPS - 1),
    ),
);

export const PRIOR_MEAN = 0.0;
export const PRIOR_SD = 2.0;

export const INITIAL_SE = PRIOR_SD;

export const SE_CONVERGENCE = 0.40;

export const MAX_QUESTIONS = 35;
export const MIN_QUESTIONS = 18;

export const FETCH_WINDOW = 1.5;

export const CONTENT_TARGET: Readonly<Record<AbilityDimension, number>> = {
    GRAMMAR: 0.40,
    VOCABULARY: 0.40,
    READING: 0.20,
};

export const LEVEL_BOUNDARIES: ReadonlyArray<{ level: Level; min: number; max: number }> = [
    { level: 'A1', min: -4.0, max: -2.6 },
    { level: 'A1_PLUS', min: -2.6, max: -2.0 },
    { level: 'A2', min: -2.0, max: -1.2 },
    { level: 'A2_PLUS', min: -1.2, max: -0.5 },
    { level: 'B1', min: -0.5, max: 0.3 },
    { level: 'B1_PLUS', min: 0.3, max: 1.0 },
    { level: 'B2', min: 1.0, max: 1.8 },
    { level: 'B2_PLUS', min: 1.8, max: 2.3 },
    { level: 'C1', min: 2.3, max: 3.1 },
    { level: 'C2', min: 3.1, max: 4.1 },
] as const;

export function p2PL(theta: number, b: number, a: number): number {
    return 1 / (1 + Math.exp(-a * (theta - b)));
}

export function info2PL(theta: number, b: number, a: number): number {
    const p = p2PL(theta, b, a);
    return a * a * p * (1 - p);
}

export function eapForDimension(
    responses: ReadonlyArray<{ difficulty: number; discrimination: number; correct: boolean }>,
): { estimate: number; se: number } {
    if (responses.length === 0) {
        return { estimate: PRIOR_MEAN, se: PRIOR_SD };
    }

    const logPrior = THETA_GRID.map(
        (theta) => -0.5 * ((theta - PRIOR_MEAN) / PRIOR_SD) ** 2,
    );

    const logLik = THETA_GRID.map((theta) => {
        let ll = 0;
        for (const r of responses) {
            const p = p2PL(theta, r.difficulty, r.discrimination);
            ll += r.correct
                ? Math.log(Math.max(p, 1e-10))
                : Math.log(Math.max(1 - p, 1e-10));
        }
        return ll;
    });

    const logPosterior = logLik.map((ll, idx) => ll + logPrior[idx]);
    const maxLogPosterior = Math.max(...logPosterior);
    const posterior = logPosterior.map((lp) => Math.exp(lp - maxLogPosterior));
    const normalization = posterior.reduce((sum, value) => sum + value, 0);

    const normalizedPosterior = posterior.map((value) =>
        normalization > 0 ? value / normalization : 0,
    );

    const estimate = THETA_GRID.reduce(
        (sum, theta, idx) => sum + theta * normalizedPosterior[idx],
        0,
    );

    const variance = THETA_GRID.reduce(
        (sum, theta, idx) => {
            const diff = theta - estimate;
            return sum + diff * diff * normalizedPosterior[idx];
        },
        0,
    );

    return { estimate, se: Math.sqrt(variance) };
}
