import { ListeningType, Prisma } from '@prisma/client';

export const STUDY_MODE_MAX_PLAYS = 10; // щедро, но не бесконечно — держим честный предел
export const STUDY_MODE_BASE_XP = 20;
export const PRACTICE_MODE_BASE_XP = 40;

// Небольшой, но осмысленный бонус за то, что задание пройдено на уровне,
// где помощь уже не действует — стимулирует расти, а не залипать в Guided-зоне.
export const STRICT_ZONE_XP_BONUS_MULTIPLIER = 1.25;

// Сколько вопросов ОБЯЗАНО быть у материала каждого типа — 1 в 1 с реальным тестом.
// Валидируется при bulkCreate.
export const REQUIRED_QUESTION_COUNT: Readonly<Record<ListeningType, number>> = {
  LISTEN_CHOOSE_RESPONSE: 1,
  CONVERSATION: 2,
  ANNOUNCEMENT: 2,
  ACADEMIC_TALK: 4,
} as const;

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