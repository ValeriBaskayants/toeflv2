import { ListeningMode, Level, Prisma } from '@prisma/client';

export const MODE_MAX_PLAYS: Readonly<Record<ListeningMode, number>> = {
  EASY: 99,
  MEDIUM: 3,
  HARD: 1,
} as const;

export const MODE_SCORE_MULTIPLIER: Readonly<Record<ListeningMode, number>> = {
  EASY: 0.7,
  MEDIUM: 1.0,
  HARD: 1.3,
} as const;

export const MODE_BASE_XP: Readonly<Record<ListeningMode, number>> = {
  EASY: 20,
  MEDIUM: 35,
  HARD: 55,
} as const;

export const LEVEL_SPEECH_RATE: Readonly<Record<Level, number>> = {
  A1: 0.65,
  A1_PLUS: 0.72,
  A2: 0.8,
  A2_PLUS: 0.88,
  B1: 0.95,
  B1_PLUS: 1.0,
  B2: 1.05,
  B2_PLUS: 1.1,
  C1: 1.18,
  C2: 1.25,
} as const;

export const LIST_SELECT = {
  id: true,
  title: true,
  topic: true,
  level: true,
  type: true,
  speakerRate: true,
  speakerLang: true,
  speakerPitch: true,
  allowedModes: true,
  createdAt: true,
  _count: { select: { questions: true } },
} satisfies Prisma.ListeningMaterialSelect;
