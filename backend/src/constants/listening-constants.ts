import { ListeningType, Prisma } from '@prisma/client';

export const STUDY_MODE_MAX_PLAYS = 10; 
export const STUDY_MODE_BASE_XP = 20;
export const PRACTICE_MODE_BASE_XP = 40;



export const STRICT_ZONE_XP_BONUS_MULTIPLIER = 1.25;








export const REQUIRED_QUESTION_COUNT: Readonly<Record<ListeningType, number>> = {
  LISTEN_CHOOSE_RESPONSE: 1,
  CONVERSATION: 2,
  ANNOUNCEMENT: 2,
  ACADEMIC_TALK: 5,
} as const;








const PRACTICE_PACE_SEC_PER_QUESTION: Readonly<Record<ListeningType, number>> = {
  LISTEN_CHOOSE_RESPONSE: 20,
  CONVERSATION: 25,
  ANNOUNCEMENT: 25,
  ACADEMIC_TALK: 30,
} as const;

export function computeAnswerWindowSec(type: ListeningType, questionCount: number): number {
  return PRACTICE_PACE_SEC_PER_QUESTION[type] * questionCount;
}

export const VOICE_BY_LANG: Readonly<Record<string, string>> = {
  'en-US': 'en-US-AriaNeural',
  'en-GB': 'en-GB-SoniaNeural',
  'en-AU': 'en-AU-NatashaNeural',
};
export const DEFAULT_VOICE = 'en-US-AriaNeural';

export function resolveVoiceForLang(lang: string): string {
  return VOICE_BY_LANG[lang] ?? DEFAULT_VOICE;
}

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