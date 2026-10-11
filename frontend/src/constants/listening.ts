import { GraduationCap, Headphones, Megaphone, MessagesSquare, type LucideIcon } from 'lucide-react';
import { ListeningType } from '@/types/globalTypes';

export type ListeningTaskKey = 'chooseResponse' | 'conversation' | 'announcement' | 'academicTalk';

export interface ListeningTaskMeta {
  type: ListeningType;
  key: ListeningTaskKey; 
  slug: string; 
  toeflEndpoint: string; 
  icon: LucideIcon;
  color: string;
}


const TASK_BY_TYPE: Readonly<Record<ListeningType, ListeningTaskMeta>> = {
  [ListeningType.LISTEN_CHOOSE_RESPONSE]: {
    type: ListeningType.LISTEN_CHOOSE_RESPONSE, key: 'chooseResponse', slug: 'choose-response',
    toeflEndpoint: 'choose-response', icon: Headphones, color: '#0ea5e9',
  },
  [ListeningType.CONVERSATION]: {
    type: ListeningType.CONVERSATION, key: 'conversation', slug: 'conversation',
    toeflEndpoint: 'conversation', icon: MessagesSquare, color: '#8b5cf6',
  },
  [ListeningType.ANNOUNCEMENT]: {
    type: ListeningType.ANNOUNCEMENT, key: 'announcement', slug: 'announcement',
    toeflEndpoint: 'announcement', icon: Megaphone, color: '#f59e0b',
  },
  [ListeningType.ACADEMIC_TALK]: {
    type: ListeningType.ACADEMIC_TALK, key: 'academicTalk', slug: 'academic-talk',
    toeflEndpoint: 'academic-talk', icon: GraduationCap, color: '#10b981',
  },
};

export const LISTENING_TASKS: readonly ListeningTaskMeta[] = Object.values(TASK_BY_TYPE);

export function getTaskByType(type: ListeningType): ListeningTaskMeta {
  return TASK_BY_TYPE[type];
}

export function getTaskBySlug(slug: string | undefined): ListeningTaskMeta | undefined {
  return LISTENING_TASKS.find((task) => task.slug === slug);
}


export const LIST_CACHE_TTL_MS = 60_000;


export const NOTES_AUTOSAVE_MS = 3_000;
export const NOTES_MAX_LENGTH = 2_000; 

export const TIMED_OUT_SELECTED_INDEX = -1; 
export const TIMER_WARNING_SEC_MAX = 10;

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;

export const STORAGE_KEYS = {
  showTime: 'toefl_listening_show_time',
  volume: 'toefl_listening_volume',
} as const;


export const FEEDBACK_BANDS = { perfect: 100, strong: 80, ok: 60, low: 40 } as const;