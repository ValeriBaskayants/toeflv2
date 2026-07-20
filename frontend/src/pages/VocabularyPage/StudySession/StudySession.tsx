import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, RefreshCw, RotateCcw, Sparkles, Star, WifiOff } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
    fetchSession,
    submitVocabAnswer,
    clearSession,
    selectSessionCards,
    selectSessionStatus,
    selectSessionError,
} from '@/store/Slices/VocabularySlice';
import type { VocabCard, SubmitVocabAnswerPayload } from '@/types/vocabulary/Vocabulary';
import { normalizeWord } from '@/utils/vocabText';
import { McqCard } from './McqCarde/McqCard';
import { ClozeCard } from './ClozeCard/ClozeCard';
import styles from './StudySession.module.css';

type Feedback = 'idle' | 'correct' | 'wrong';

const ADVANCE_DELAY_MS = 550;
const TOAST_DURATION_MS = 3200;
const MASTERED_DURATION_MS = 2400;
const SESSION_LIMIT = 20;

export function StudySession() {
    const { t } = useTranslation('vocabulary');
    const dispatch = useAppDispatch();

    const cards = useAppSelector(selectSessionCards);
    const status = useAppSelector(selectSessionStatus);
    const error = useAppSelector(selectSessionError);

    // The local queue is the single source of truth for what's on screen — seeded once
    // from the server batch, then mutated purely client-side (shift on advance, push-back
    // on network failure). This is what makes the UI feel instant: no round trip is ever
    // awaited before rendering the next card.
    const [queue, setQueue] = useState<VocabCard[]>([]);
    const [total, setTotal] = useState(0);
    const [started, setStarted] = useState(false);

    const [feedback, setFeedback] = useState<Feedback>('idle');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [masteredPulse, setMasteredPulse] = useState(false);
    const [networkToast, setNetworkToast] = useState(false);

    useEffect(() => {
        if (status === 'idle') void dispatch(fetchSession({ limit: SESSION_LIMIT }));
    }, [status, dispatch]);

    useEffect(() => {
        if (status === 'success' && !started) {
            setQueue(cards);
            setTotal(cards.length);
            setStarted(true);
        }
    }, [status, cards, started]);

    const current = queue[0] ?? null;
    const completed = total - queue.length;

    const advance = useCallback(() => {
        setQueue((q) => q.slice(1));
        setFeedback('idle');
        setSelectedId(null);
    }, []);

    const commitAnswer = useCallback(
        (card: VocabCard, isCorrect: boolean, payload: SubmitVocabAnswerPayload) => {
            // 1. Instant local verdict: lock inputs, flash animation, queue the advance.
            setFeedback(isCorrect ? 'correct' : 'wrong');
            window.setTimeout(advance, ADVANCE_DELAY_MS);

            // 2. Background persistence — the UI never waits on this network call.
            dispatch(submitVocabAnswer(payload))
                .unwrap()
                .then((res) => {
                    if (res.justMastered) {
                        setMasteredPulse(true);
                        window.setTimeout(() => setMasteredPulse(false), MASTERED_DURATION_MS);
                    }
                })
                .catch(() => {
                    setNetworkToast(true);
                    window.setTimeout(() => setNetworkToast(false), TOAST_DURATION_MS);
                    // Requeue at the end of the session so the card gets another shot.
                    setQueue((q) => [...q, card]);
                    setTotal((t2) => t2 + 1);
                });
        },
        [dispatch, advance],
    );

    const handleMcqSelect = useCallback(
        (optionId: string) => {
            if (current === null || current.type !== 'MCQ' || feedback !== 'idle') return;
            setSelectedId(optionId);
            const isCorrect = optionId === current.cardId;
            commitAnswer(current, isCorrect, { wordId: current.cardId, type: 'MCQ', selectedId: optionId });
        },
        [current, feedback, commitAnswer],
    );

    const handleClozeSubmit = useCallback(
        (answerText: string) => {
            if (current === null || current.type !== 'CLOZE' || feedback !== 'idle') return;
            const isCorrect = normalizeWord(answerText) === normalizeWord(current.answer);
            commitAnswer(current, isCorrect, { wordId: current.cardId, type: 'CLOZE', answerText });
        },
        [current, feedback, commitAnswer],
    );

    const handleRestart = useCallback(() => {
        dispatch(clearSession());
        setQueue([]);
        setTotal(0);
        setStarted(false);
        setFeedback('idle');
        setSelectedId(null);
        void dispatch(fetchSession({ limit: SESSION_LIMIT }));
    }, [dispatch]);

    if (status === 'loading' || status === 'idle') {
        return (
            <div className={styles['loadingState']}>
                <div className={styles['loadingPulse']} />
                <div className={styles['loadingPulse']} style={{ animationDelay: '0.15s' }} />
                <div className={styles['loadingPulse']} style={{ animationDelay: '0.3s' }} />
                <p className={styles['loadingText']}>{t('loading')}</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className={styles['errorState']}>
                <AlertCircle size={28} />
                <p>{error ?? t('error')}</p>
                <button type="button" className={styles['retryBtn']} onClick={handleRestart}>
                    <RefreshCw size={14} /> {t('retry')}
                </button>
            </div>
        );
    }

    if (total === 0) {
        return (
            <div className={styles['stateBlock']}>
                <div className={styles['caughtUpIcon']}>
                    <CheckCircle2 size={36} />
                </div>
                <h2 className={styles['stateTitle']}>{t('flashcard.allCaughtUp')}</h2>
                <p className={styles['stateText']}>{t('flashcard.allCaughtUpText')}</p>
            </div>
        );
    }

    if (current === null) {
        return (
            <div className={styles['stateBlock']}>
                <div className={styles['completeBurst']}>
                    <Sparkles size={32} />
                </div>
                <h2 className={styles['stateTitle']}>{t('flashcard.sessionDone')}</h2>
                <p className={styles['stateText']}>
                    {t('flashcard.sessionText', { count: total, plural: total !== 1 ? 's' : '' })}
                </p>
                <button type="button" className={styles['restartBtn']} onClick={handleRestart}>
                    <RotateCcw size={14} /> {t('flashcard.studyMore')}
                </button>
            </div>
        );
    }

    const isLocked = feedback !== 'idle';

    return (
        <div className={styles['wrap']}>
            {masteredPulse && (
                <div className={styles['toast']}>
                    <Star size={14} /> {t('flashcard.mastered')} 🎉
                </div>
            )}
            {networkToast && (
                <div className={`${styles['toast']} ${styles['toastError']}`}>
                    <WifiOff size={14} /> {t('flashcard.networkError')}
                </div>
            )}

            <div className={styles['progressWrap']}>
                <div className={styles['progressTrack']}>
                    <div className={styles['progressFill']} style={{ width: `${(completed / total) * 100}%` }} />
                </div>
                <span className={styles['progressCounter']}>
                    {completed + 1} / {total}
                </span>
            </div>

            <div
                key={current.cardId}
                className={[
                    styles['cardSlot'],
                    feedback === 'correct' ? styles['slotCorrect'] : '',
                    feedback === 'wrong' ? styles['slotWrong'] : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                {current.type === 'MCQ' ? (
                    <McqCard
                        card={current}
                        disabled={isLocked}
                        feedback={feedback}
                        selectedId={selectedId}
                        onSelect={handleMcqSelect}
                    />
                ) : (
                    <ClozeCard card={current} disabled={isLocked} feedback={feedback} onSubmit={handleClozeSubmit} />
                )}
            </div>
        </div>
    );
}