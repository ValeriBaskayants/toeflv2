import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';

import {
    LEVEL_DISPLAY,
    LEVEL_COLOR,
    LEVEL_VALUES,
    DIFFICULTY_VALUES,
    DIFFICULTY_COLOR,
    STATUS_DOT,
} from '@/constants/level';

import styles from './ExerciseList.module.css';
import { selectFilteredExercises, selectExercisesListIsLoading, selectActiveDifficulty, selectActiveTopic, selectTopics, selectActiveExerciseId, setActiveDifficulty, setActiveTopic, openExercise } from '@/store/Slices/ExercisesSlice';
import { selectActiveLevel, setActiveLevel } from '@/store/Slices/GrammarRulesSlice';
import type { Exercise } from '@/types/exercises/Exercise.types';
import type { Level, Difficulty } from '@/types/globalTypes';

// ─── Shared badges (used only inside this component) ──────────────────────────

function LevelBadge({ level }: { level: string }) {
    const color = LEVEL_COLOR[level] ?? '#6366f1';
    return (
        <span
            className={styles['levelBadge']}
            style={{ backgroundColor: `${color}18`, color, borderColor: `${color}35` }}
        >
            {LEVEL_DISPLAY[level] ?? level}
        </span>
    );
}

function DifficultyPip({ difficulty }: { difficulty: string }) {
    const { t } = useTranslation('exercises');
    const color = DIFFICULTY_COLOR[difficulty] ?? 'var(--text-3)';
    return (
        <span className={styles['difficultyPip']} style={{ color }}>
            <span className={styles['difficultyDot']} style={{ background: color }} />
            {t(`difficulty.${difficulty}`, { defaultValue: difficulty })}
        </span>
    );
}

// ─── ExerciseListItem ─────────────────────────────────────────────────────────

interface ExerciseListItemProps {
    exercise: Exercise;
    isActive: boolean;
    onSelect: () => void;
}

function ExerciseListItem({ exercise, isActive, onSelect }: ExerciseListItemProps) {
    const dotColor = STATUS_DOT[exercise.userStatus ?? 'not_started'];
    const accentColor = LEVEL_COLOR[exercise.level] ?? '#6366f1';

    return (
        <button
            type="button"
            className={clsx(styles['listItem'], isActive && styles['listItemActive'])}
            style={isActive ? ({ '--item-accent': accentColor } as React.CSSProperties) : undefined}
            onClick={onSelect}
            aria-current={isActive ? 'true' : undefined}
        >
            <span className={styles['listItemDot']} style={{ background: dotColor }} />
            <span className={styles['listItemContent']}>
                <span className={styles['listItemTopic']}>{exercise.topic}</span>
                <span className={styles['listItemMeta']}>
                    <LevelBadge level={exercise.level} />
                    <DifficultyPip difficulty={exercise.difficulty} />
                </span>
            </span>
            {isActive && <ChevronRight size={14} className={styles['listItemArrow']} />}
        </button>
    );
}

// ─── ExerciseList ─────────────────────────────────────────────────────────────

export function ExerciseList() {
    const { t } = useTranslation('exercises');
    const dispatch = useAppDispatch();

    const exercises = useAppSelector(selectFilteredExercises);
    const isLoading = useAppSelector(selectExercisesListIsLoading);
    const activeLevel = useAppSelector(selectActiveLevel);
    const activeDiff = useAppSelector(selectActiveDifficulty);
    const activeTopic = useAppSelector(selectActiveTopic);
    const topics = useAppSelector(selectTopics);
    const activeId = useAppSelector(selectActiveExerciseId);

    const handleLevelClick = useCallback((level: Level | null) => {
        dispatch(setActiveLevel(level));
    }, [dispatch]);

    const handleDifficultyClick = useCallback((diff: Difficulty | null) => {
        dispatch(setActiveDifficulty(diff));
    }, [dispatch]);

    const handleTopicClick = useCallback((topic: string | null) => {
        dispatch(setActiveTopic(topic));
    }, [dispatch]);

    const handleSelectExercise = useCallback((id: string) => {
        dispatch(openExercise(id));
    }, [dispatch]);

    const difficultyLabel: Record<string, string> = {
        EASY: t('filters.easy'),
        MEDIUM: t('filters.medium'),
        HARD: t('filters.hard'),
    };

    return (
        <aside className={styles['sidebar']}>
            {/* ── Level filter ── */}
            <div className={styles['filterSection']}>
                <span className={styles['filterLabel']}>{t('filters.levelAriaLabel')}</span>
                <div
                    className={styles['pillGroup']}
                    role="group"
                    aria-label={t('filters.levelAriaLabel')}
                >
                    {LEVEL_VALUES.map((value) => {
                        const label = value === null ? t('filters.allLevels') : (LEVEL_DISPLAY[value] ?? value);
                        const isActive = activeLevel === value;
                        const color = value !== null ? (LEVEL_COLOR[value] ?? 'var(--accent)') : 'var(--accent)';
                        return (
                            <button
                                key={label}
                                type="button"
                                className={clsx(styles['pill'], isActive && styles['pillActive'])}
                                style={isActive ? ({ '--pill-color': color } as React.CSSProperties) : undefined}
                                onClick={() => handleLevelClick(value)}
                                aria-pressed={isActive}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Difficulty filter ── */}
            <div className={styles['filterSection']}>
                <span className={styles['filterLabel']}>{t('filters.difficultyAriaLabel')}</span>
                <div
                    className={styles['pillGroup']}
                    role="group"
                    aria-label={t('filters.difficultyAriaLabel')}
                >
                    {DIFFICULTY_VALUES.map((value) => {
                        const label = value === null ? t('filters.anyDifficulty') : (difficultyLabel[value] ?? value);
                        const isActive = activeDiff === value;
                        const color = value !== null ? (DIFFICULTY_COLOR[value] ?? 'var(--text-3)') : 'var(--text-3)';
                        return (
                            <button
                                key={String(value)}
                                type="button"
                                className={clsx(styles['pill'], styles['pillDiff'], isActive && styles['pillDiffActive'])}
                                style={isActive ? ({ '--diff-color': color } as React.CSSProperties) : undefined}
                                onClick={() => handleDifficultyClick(value)}
                                aria-pressed={isActive}
                            >
                                {value !== null && (
                                    <span className={styles['diffDot']} style={{ background: color }} />
                                )}
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Topic filter ── */}
            {topics.length > 0 && (
                <div className={styles['filterSection']}>
                    <span className={styles['filterLabel']}>{t('sidebar.topicLabel')}</span>
                    <div className={styles['topicList']}>
                        <button
                            type="button"
                            className={clsx(styles['topicBtn'], activeTopic === null && styles['topicBtnActive'])}
                            onClick={() => handleTopicClick(null)}
                        >
                            {t('sidebar.allTopics')}
                        </button>
                        {topics.map((topic) => (
                            <button
                                key={topic}
                                type="button"
                                className={clsx(styles['topicBtn'], activeTopic === topic && styles['topicBtnActive'])}
                                onClick={() => handleTopicClick(topic)}
                                title={topic}
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Exercise list ── */}
            <div className={styles['listHeader']}>
                <span className={styles['listCount']}>
                    {t('sidebar.exerciseCount', {
                        count: exercises.length,
                        plural: exercises.length !== 1 ? 's' : '',
                    })}
                </span>
                {isLoading && <span className={styles['listSpinner']} />}
            </div>

            <div className={styles['exerciseList']} role="list">
                {exercises.length === 0 && !isLoading ? (
                    <div className={styles['listEmpty']}>
                        <p>{t('sidebar.noMatch')}</p>
                    </div>
                ) : (
                    exercises.map((ex) => (
                        <ExerciseListItem
                            key={ex.id}
                            exercise={ex}
                            isActive={ex.id === activeId}
                            onSelect={() => handleSelectExercise(ex.id)}
                        />
                    ))
                )}
            </div>
        </aside>
    );
}