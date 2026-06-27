import { useEffect, useCallback, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
    Zap, RotateCcw, ArrowRight, CheckCircle2, XCircle,
    BookOpen, Sparkles, Layers, BarChart2, Tag,
    AlertCircle, ChevronDown,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';

import styles from './ExerciseWorkspace.module.css';
import { LEVEL_COLOR, LEVEL_DISPLAY, DIFFICULTY_COLOR } from '@/constants/level';
import { selectActiveExercise, selectAnswers, selectSubmitIsLoading, selectSubmitResult, selectIsRevealed, selectAnswerProgress, setAnswer, submitExerciseAnswer, retryExercise, nextExercise } from '@/store/Slices/ExercisesSlice';
import { selectSubmitError } from '@/store/Slices/ReadingsSlice';
import type { Blank, BlankResult, Exercise } from '@/types/exercises/Exercise.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SentenceSegment =
    | { type: 'text'; content: string }
    | { type: 'blank'; position: number };

function parseSentence(sentence: string, blanks: Blank[]): SentenceSegment[] {
    const segments: SentenceSegment[] = [];
    const parts = sentence.split('___');
    parts.forEach((part, idx) => {
        if (part.length > 0) {
            segments.push({ type: 'text', content: part });
        }
        if (idx < blanks.length) {
            const blank = blanks[idx];
            if (blank !== undefined) {
                segments.push({ type: 'blank', position: blank.position });
            }
        }
    });
    return segments;
}

function getInputWidth(blank: Blank): string {
    const longest = [blank.answer, ...blank.options].reduce(
        (a, b) => (b.length > a.length ? b : a),
        '',
    );
    return `${Math.max(longest.length, 6) + 2}ch`;
}

// ─── LevelBadge ───────────────────────────────────────────────────────────────

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

// ─── DifficultyPip ────────────────────────────────────────────────────────────

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

// ─── BlankInput ───────────────────────────────────────────────────────────────

interface BlankInputProps {
    blank: Blank;
    value: string;
    result: BlankResult | null;
    isRevealed: boolean;
    onChange: (value: string) => void;
    onEnter: () => void;
    inputRef?: React.Ref<HTMLInputElement>;
}

function BlankInput({
    blank, value, result, isRevealed, onChange, onEnter, inputRef,
}: BlankInputProps) {
    const { t } = useTranslation('exercises');
    const isOk = isRevealed && result !== null && result.isCorrect;
    const isWrong = isRevealed && result !== null && !result.isCorrect;

    const displayValue = isWrong && result !== null ? result.correctAnswer : value;

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { onEnter(); }
    };

    return (
        <span className={styles['blankWrap']}>
            <input
                ref={inputRef}
                type="text"
                className={clsx(
                    styles['blankInput'],
                    isOk && styles['blankInputCorrect'],
                    isWrong && styles['blankInputWrong'],
                    isRevealed && styles['blankInputRevealed'],
                )}
                style={{ width: getInputWidth(blank) }}
                value={displayValue}
                onChange={(e) => { if (!isRevealed) { onChange(e.target.value); } }}
                onKeyDown={handleKeyDown}
                disabled={isRevealed}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label={t('exercise.blank', { n: blank.position + 1 })}
            />
            {isOk && <CheckCircle2 size={13} className={styles['blankIconOk']} />}
            {isWrong && <XCircle size={13} className={styles['blankIconWrong']} />}
            {isWrong && result !== null && (
                <span className={styles['blankUserAnswer']}>
                    {result.userAnswer.length > 0 ? result.userAnswer : t('exercise.empty')}
                </span>
            )}
        </span>
    );
}

// ─── SentenceRenderer ─────────────────────────────────────────────────────────

interface SentenceRendererProps {
    exercise: Exercise;
    answers: Record<number, string>;
    results: BlankResult[] | null;
    isRevealed: boolean;
    onAnswer: (position: number, value: string) => void;
    onSubmit: () => void;
}

function SentenceRenderer({
    exercise, answers, results, isRevealed, onAnswer, onSubmit,
}: SentenceRendererProps) {
    const firstInputRef = useRef<HTMLInputElement>(null);
    const segments = parseSentence(exercise.sentence, exercise.blanks);

    // Focus first blank whenever a new exercise is opened
    useEffect(() => {
        firstInputRef.current?.focus();
    }, [exercise.id]);

    const getResult = (position: number): BlankResult | null =>
        results?.find((r) => r.position === position) ?? null;

    let blankIdx = 0;

    return (
        <p className={styles['sentence']} lang="en">
            {segments.map((seg, idx) => {
                if (seg.type === 'text') {
                    return <span key={idx}>{seg.content}</span>;
                }
                const blank = exercise.blanks.find((b) => b.position === seg.position);
                if (blank === undefined) { return null; }
                const isFirst = blankIdx === 0;
                blankIdx++;
                return (
                    <BlankInput
                        key={seg.position}
                        blank={blank}
                        value={answers[seg.position] ?? ''}
                        result={getResult(seg.position)}
                        isRevealed={isRevealed}
                        onChange={(v) => onAnswer(seg.position, v)}
                        onEnter={onSubmit}
                        inputRef={isFirst ? firstInputRef : null}
                    />
                );
            })}
        </p>
    );
}

// ─── ResultPanel ──────────────────────────────────────────────────────────────

interface ResultPanelProps {
    accuracy: number;
    xpEarned: number;
    feedback: string;
    explanation: string;
    onRetry: () => void;
    onNext: () => void;
}

function ResultPanel({
    accuracy, xpEarned, feedback, explanation, onRetry, onNext,
}: ResultPanelProps) {
    const { t } = useTranslation('exercises');
    const isGreat = accuracy === 100;
    const isGood = accuracy >= 75;

    return (
        <div
            className={clsx(
                styles['resultPanel'],
                isGreat && styles['resultPanelPerfect'],
                !isGreat && isGood && styles['resultPanelGood'],
                !isGood && styles['resultPanelRetry'],
            )}
        >
            <div className={styles['resultTop']}>
                <div className={styles['resultScore']}>
                    {isGreat
                        ? <Sparkles size={20} className={styles['resultIconPerfect']} />
                        : <BarChart2 size={20} className={styles['resultIconNormal']} />
                    }
                    <span className={styles['resultAccuracy']}>{accuracy}%</span>
                    <span className={styles['resultLabel']}>{t('exercise.accuracy')}</span>
                </div>
                <div className={styles['resultXp']}>
                    <Zap size={14} />
                    +{xpEarned} XP
                </div>
            </div>

            <p className={styles['resultFeedback']}>{feedback}</p>

            {explanation.length > 0 && (
                <details className={styles['explanationDetails']}>
                    <summary className={styles['explanationSummary']}>
                        <BookOpen size={13} />
                        {t('exercise.explanation')}
                        <ChevronDown size={13} className={styles['explanationChevron']} />
                    </summary>
                    <p className={styles['explanationBody']}>{explanation}</p>
                </details>
            )}

            <div className={styles['resultActions']}>
                <button type="button" className={styles['retryBtn']} onClick={onRetry}>
                    <RotateCcw size={14} />
                    {t('exercise.tryAgain')}
                </button>
                <button type="button" className={styles['nextBtn']} onClick={onNext}>
                    {t('exercise.nextExercise')}
                    <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}

// ─── EmptyWorkspace ───────────────────────────────────────────────────────────

function EmptyWorkspace() {
    const { t } = useTranslation('exercises');
    return (
        <div className={styles['empty']}>
            <BookOpen size={48} className={styles['emptyIcon']} />
            <p className={styles['emptyTitle']}>{t('empty.title')}</p>
            <p className={styles['emptyHint']}>{t('empty.hint')}</p>
        </div>
    );
}

// ─── ExerciseWorkspace ────────────────────────────────────────────────────────

export function ExerciseWorkspace() {
    const { t } = useTranslation('exercises');
    const dispatch = useAppDispatch();

    const exercise = useAppSelector(selectActiveExercise);
    const answers = useAppSelector(selectAnswers);
    const submitIsLoading = useAppSelector(selectSubmitIsLoading);
    const submitError = useAppSelector(selectSubmitError);
    const submitResult = useAppSelector(selectSubmitResult);
    const isRevealed = useAppSelector(selectIsRevealed);
    const progress = useAppSelector(selectAnswerProgress);

    const handleAnswer = useCallback((position: number, value: string) => {
        dispatch(setAnswer({ position, value }));
    }, [dispatch]);

    const handleSubmit = useCallback(() => {
        if (exercise === null) { return; }
        const orderedAnswers = exercise.blanks.map((b) => answers[b.position] ?? '');
        void dispatch(submitExerciseAnswer({
            exerciseId: exercise.id,
            answers: orderedAnswers,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }));
    }, [exercise, answers, dispatch]);

    const handleRetry = useCallback(() => { dispatch(retryExercise()); }, [dispatch]);
    const handleNext = useCallback(() => { dispatch(nextExercise()); }, [dispatch]);

    if (exercise === null) {
        return <EmptyWorkspace />;
    }

    const accentColor = LEVEL_COLOR[exercise.level] ?? '#6366f1';
    const canSubmit = progress.filled === progress.total && !isRevealed && !submitIsLoading;

    return (
        <div
            className={styles['workspace']}
            style={{ '--ex-accent': accentColor } as React.CSSProperties}
        >
            {/* Top accent line */}
            <div className={styles['accentBar']} />

            {/* ── Header: badges + progress ── */}
            <div className={styles['header']}>
                <div className={styles['headerLeft']}>
                    <LevelBadge level={exercise.level} />
                    <DifficultyPip difficulty={exercise.difficulty} />
                    {exercise.tags.length > 0 && (
                        <span className={styles['tag']}>
                            <Tag size={10} />
                            {exercise.tags[0]}
                        </span>
                    )}
                </div>
                <div className={styles['progress']}>
                    <span className={styles['progressText']}>
                        {t('exercise.filledProgress', {
                            filled: progress.filled,
                            total: progress.total,
                        })}
                    </span>
                    <div className={styles['progressBar']}>
                        <div
                            className={styles['progressFill']}
                            style={{
                                width: `${progress.total > 0
                                    ? (progress.filled / progress.total) * 100
                                    : 0}%`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Topic ── */}
            <div className={styles['topicRow']}>
                <Layers size={15} className={styles['topicIcon']} />
                <span className={styles['topic']}>{exercise.topic}</span>
            </div>

            {/* ── Sentence ── */}
            <div className={styles['sentenceWrap']}>
                <SentenceRenderer
                    exercise={exercise}
                    answers={answers}
                    results={submitResult?.results ?? null}
                    isRevealed={isRevealed}
                    onAnswer={handleAnswer}
                    onSubmit={handleSubmit}
                />
            </div>

            {/* ── MCQ option chips ── */}
            {!isRevealed && exercise.blanks.some((b) => b.options.length > 0) && (
                <div className={styles['optionsHint']}>
                    {exercise.blanks.map((blank) =>
                        blank.options.length > 0 ? (
                            <div key={blank.position} className={styles['optionsGroup']}>
                                <span className={styles['optionsLabel']}>
                                    {t('exercise.blank', { n: blank.position + 1 })}:
                                </span>
                                {blank.options.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={clsx(
                                            styles['optionChip'],
                                            answers[blank.position] === opt && styles['optionChipSelected'],
                                        )}
                                        onClick={() => handleAnswer(blank.position, opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : null,
                    )}
                </div>
            )}

            {/* ── Submit error ── */}
            {submitError !== null && (
                <div className={styles['submitError']}>
                    <AlertCircle size={14} />
                    {submitError}
                </div>
            )}

            {/* ── Submit button ── */}
            {!isRevealed && (
                <button
                    type="button"
                    className={clsx(styles['submitBtn'], canSubmit && styles['submitBtnReady'])}
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitIsLoading}
                >
                    {submitIsLoading
                        ? <span className={styles['submitSpinner']} />
                        : <CheckCircle2 size={16} />
                    }
                    {submitIsLoading ? t('exercise.checking') : t('exercise.checkAnswers')}
                </button>
            )}

            {/* ── Result panel ── */}
            {isRevealed && submitResult !== null && (
                <ResultPanel
                    accuracy={submitResult.accuracy}
                    xpEarned={submitResult.xpEarned}
                    feedback={submitResult.feedback}
                    explanation={submitResult.explanation}
                    onRetry={handleRetry}
                    onNext={handleNext}
                />
            )}
        </div>
    );
}