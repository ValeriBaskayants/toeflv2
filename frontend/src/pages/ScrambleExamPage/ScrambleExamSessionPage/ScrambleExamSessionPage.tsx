import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { resumeScrambleExam, submitScrambleExamItem, expireScrambleExam, resetExam } from '@/store/Slices/ScrambleExamSlice';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './ScrambleExamSessionPage.module.css';
import { WordArrangeBoard } from '@/components/component/scramble/WordArrangeBoard/WordArrangeBoard';

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ScrambleExamSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { blockId: urlBlockId } = useParams<{ blockId: string }>();

  const {
    blockId, startedAtMs, totalTimeBudgetSec, currentItem, isSubmitting, finished, timedOut, error,
  } = useAppSelector((s) => s.scrambleExam);

  const [bank, setBank] = useState<string[]>([]);
  const [line, setLine] = useState<string[]>([]);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    if (urlBlockId !== undefined && urlBlockId !== blockId) {
      void dispatch(resumeScrambleExam(urlBlockId));
    }
  }, [urlBlockId, blockId, dispatch]);

  useEffect(() => {
    if (currentItem !== null) {
      setBank(currentItem.words.map((w) => w.id));
      setLine([]);
    }
  }, [currentItem]);

  const handleExpire = useCallback(() => {
    void dispatch(expireScrambleExam());
  }, [dispatch]);

  useEffect(() => {
    if (startedAtMs === null || totalTimeBudgetSec === null || finished) return undefined;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      const remaining = totalTimeBudgetSec - elapsed;
      setRemainingSec(Math.max(0, remaining));
      if (remaining <= 0) handleExpire();
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [startedAtMs, totalTimeBudgetSec, finished, handleExpire]);

  useEffect(() => {
    if (finished && blockId !== null) {
      navigate(`/writing/scramble/exam/result/${blockId}${timedOut ? '?timedOut=1' : ''}`, { replace: true });
    }
  }, [finished, timedOut, blockId, navigate]);

  useEffect(() => {
    if (error !== null && currentItem === null && !finished) {
      navigate('/writing/scramble', { replace: true });
    }
  }, [error, currentItem, finished, navigate]);

  const handleSubmit = useCallback(async () => {
    if (line.length === 0 || isSubmitting) return;
    await dispatch(submitScrambleExamItem({ wordOrder: line, usedHint: false }));
  }, [dispatch, line, isSubmitting]);

  const handleExit = useCallback(() => {
    dispatch(resetExam());
    navigate('/writing/scramble', { replace: true });
  }, [dispatch, navigate]);

  if (currentItem === null) {
    return <FullPageSpinner label={t('scramble.loadingExercise')} />;
  }

  const isTimeWarning = remainingSec !== null && remainingSec <= 60;
  const boardWords = currentItem.words.map((w) => ({ id: w.id, word: w.word }));

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <span className={styles['stepLabel']}>
          {t('scramble.exam.itemLabel')} {currentItem.index + 1}/{currentItem.totalItems}
        </span>
        <span className={`${styles['timer']} ${isTimeWarning ? styles['timerWarn'] : ''}`}>
          {remainingSec !== null ? formatTime(remainingSec) : '--:--'}
        </span>
        <button type="button" className={styles['exitBtn']} onClick={handleExit} aria-label="Exit">
          <X size={18} />
        </button>
      </header>

      <div className={styles['progressTrack']}>
        <div className={styles['progressFill']} style={{ width: `${(currentItem.index / currentItem.totalItems) * 100}%` }} />
      </div>

      <div className={styles['promptCard']}>{currentItem.prompt}</div>

      {error !== null && <p className={styles['errorText']}>{error}</p>}

      <WordArrangeBoard
        words={boardWords}
        bank={bank}
        line={line}
        onBankChange={setBank}
        onLineChange={setLine}
        locked={isSubmitting}
        labels={{
          yourSentence: t('scramble.yourSentence'),
          wordBank: t('scramble.wordBank'),
          dropHere: t('scramble.dropHere'),
        }}
      />

      <p className={styles['noHints']}>{t('scramble.exam.noHintsNotice')}</p>

      <button
        type="button"
        className={styles['submitBtn']}
        disabled={line.length === 0 || isSubmitting}
        onClick={() => { void handleSubmit(); }}
      >
        {isSubmitting ? t('scramble.exam.submitting') : t('scramble.exam.submitBtn')}
      </button>
    </div>
  );
}