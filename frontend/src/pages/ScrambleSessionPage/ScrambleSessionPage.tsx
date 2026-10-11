import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { resumeLinearBlock, submitLinearItem, clearLinearFeedback, resetScramble } from '@/store/Slices/ScrambleSlice';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { WordArrangeBoard } from '@/components/component/scramble/WordArrangeBoard/WordArrangeBoard';
import styles from './ScrambleSessionPage.module.css';

export default function ScrambleSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { blockId: urlBlockId } = useParams<{ blockId: string }>();

  const { blockId, currentItem, isSubmitting, lastLinearFeedback, finished, correctCount, finalScorePercent, xpEarned, error } =
    useAppSelector((s) => s.scramble);

  const [bank, setBank] = useState<string[]>([]);
  const [line, setLine] = useState<string[]>([]);

  useEffect(() => {
    if (urlBlockId !== undefined && urlBlockId !== blockId) {
      void dispatch(resumeLinearBlock(urlBlockId));
    }
  }, [urlBlockId, blockId, dispatch]);

  useEffect(() => {
    if (currentItem !== null) {
      setBank(currentItem.words.tiles.map((w) => w.id));
      setLine([]);
    }
  }, [currentItem]);

  useEffect(() => {
    if (finished && blockId !== null) {
      navigate(`/writing/scramble/result/${blockId}`, { replace: true });
    }
  }, [finished, blockId, navigate]);

  const handleSubmit = useCallback(async () => {
    if (line.length === 0 || isSubmitting) return;
    await dispatch(submitLinearItem({ wordOrder: line, usedHint: false }));
  }, [dispatch, line, isSubmitting]);

  const handleNext = useCallback(() => {
    dispatch(clearLinearFeedback());
  }, [dispatch]);

  const handleExit = useCallback(() => {
    dispatch(resetScramble());
    navigate('/writing/scramble', { replace: true });
  }, [dispatch, navigate]);

  if (currentItem === null) {
    return <FullPageSpinner label={t('scramble.loadingExercise')} />;
  }

  const tiles = currentItem.words.tiles.map((w) => ({ id: w.id, word: w.word }));
  const roleMap = new Map(currentItem.words.tiles.map((w) => [w.id, w.role]));

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <span className={styles['stepLabel']}>
          {t('scramble.exam.itemLabel')} {currentItem.index + 1}/{currentItem.totalItems}
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

      {lastLinearFeedback === null ? (
        <>
          <WordArrangeBoard
            words={tiles}
            bank={bank}
            line={line}
            onBankChange={setBank}
            onLineChange={setLine}
            locked={isSubmitting}
            getChipExtra={(id) => {
              const role = roleMap.get(id);
              return role !== undefined ? <span className={styles['roleTag']}>{role.toLowerCase()}</span> : null;
            }}
            labels={{
              yourSentence: t('scramble.yourSentence'),
              wordBank: t('scramble.wordBank'),
              dropHere: t('scramble.dropHere'),
            }}
          />
          {roleMap.size > 0 && [...roleMap.values()].some((r) => r !== undefined) && (
            <p className={styles['hintNote']}>{t('scramble.hintNoteAlways')}</p>
          )}
          <button
            type="button"
            className={styles['submitBtn']}
            disabled={line.length === 0 || isSubmitting}
            onClick={() => { void handleSubmit(); }}
          >
            {isSubmitting ? t('scramble.checking') : t('scramble.checkAnswer')}
          </button>
        </>
      ) : (
        <div className={`${styles['feedbackCard']} ${lastLinearFeedback.isCorrect ? styles['feedbackOk'] : styles['feedbackErr']}`}>
          {lastLinearFeedback.isCorrect ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          <div>
            <p className={styles['feedbackTitle']}>{lastLinearFeedback.isCorrect ? t('scramble.correct') : t('scramble.incorrect')}</p>
            <p className={styles['feedbackSentence']}>{lastLinearFeedback.correctSentence}</p>
          </div>
          <button type="button" className={styles['nextBtn']} onClick={handleNext}>
            {t('scramble.next')}
          </button>
        </div>
      )}
    </div>
  );
}