import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import type { Level, PartOfSpeech, WordLearningStatus } from '@/types/globalTypes';
import styles from './Badges.module.css';

export const LEVEL_ORDER: Level[] = [
    'A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'B2_PLUS', 'C1', 'C2',
] as Level[];

export const LEVEL_DISPLAY: Record<string, string> = {
    A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
    B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
    C1: 'C1', C2: 'C2',
};

export const LEVEL_COLOR: Record<string, string> = {
    A1: '#22c55e', A1_PLUS: '#16a34a', A2: '#14b8a6', A2_PLUS: '#0d9488',
    B1: '#3b82f6', B1_PLUS: '#2563eb', B2: '#6366f1', B2_PLUS: '#4f46e5',
    C1: '#8b5cf6', C2: '#a855f7',
};

const STATUS_COLOR: Record<WordLearningStatus, { color: string; bg: string }> = {
    NEW: { color: '#64748b', bg: '#64748b18' },
    LEARNING: { color: '#3b82f6', bg: '#3b82f618' },
    REVIEW: { color: '#f59e0b', bg: '#f59e0b18' },
    MASTERED: { color: '#22c55e', bg: '#22c55e18' },
};

export function LevelBadge({ level }: { level: Level }) {
    const color = LEVEL_COLOR[level] ?? '#6366f1';
    return (
        <span className={styles['level']} style={{ '--badge-color': color } as CSSProperties}>
            {LEVEL_DISPLAY[level] ?? level}
        </span>
    );
}

export function PosBadge({ type }: { type: PartOfSpeech }) {
    const { t } = useTranslation('vocabulary');
    return <span className={styles['pos']}>{t(`pos.${type}`)}</span>;
}

export function StatusBadge({ status }: { status: WordLearningStatus }) {
    const { t } = useTranslation('vocabulary');
    const cfg = STATUS_COLOR[status];
    return (
        <span
            className={styles['status']}
            style={{ '--status-color': cfg.color, '--status-bg': cfg.bg } as CSSProperties}
        >
            {t(`status.${status}`)}
        </span>
    );
}