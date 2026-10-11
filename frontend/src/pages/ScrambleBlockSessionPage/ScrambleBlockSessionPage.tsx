import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight, LayoutGrid, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { resumeFreeNavBlock, saveDraft, finishBlock, expireBlock, setActiveIndex, resetScramble } from '@/store/Slices/ScrambleSlice';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { WordArrangeBoard } from '@/components/component/scramble/WordArrangeBoard/WordArrangeBoard';
import { formatTime } from '@/utils/formatTime';
import styles from './ScrambleBlockSessionPage.module.css';

const DRAFT_SAVE_DEBOUNCE_MS = 700;

export default function ScrambleBlockSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { blockId: urlBlockId } = useParams<{ blockId: string }>();

  const {
    blockId, kind, startedAtMs, totalTimeBudgetSec, items, drafts, activeIndex,
    isSubmitting, finished, timedOut, error,
  } = useAppSelector((s) => s.scramble);

  const [bank, setBank] = useState<string[]>([]);
  const [line, setLine] = useState<string[]>([]);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const draftTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (urlBlockId !== undefined && urlBlockId !== blockId) {
      void dispatch(resumeFreeNavBlock(urlBlockId));
    }
  }, [urlBlockId, blockId, dispatch]);

  const currentExercise = items[activeIndex] ?? null;

  // При смене активного пункта — подставляем сохранённый черновик (если есть) в доску.
  useEffect(() => {
    if (currentExercise === null) return;
    const draft = drafts[currentExercise.exerciseId];
    const allIds = currentExercise.words.tiles.map((w) => w.id);
    if (draft !== undefined) {
      setLine(draft.wordOrder);
      setBank(allIds.filter((id) => !draft.wordOrder.includes(id)));
    } else {
      setBank(allIds);
      setLine([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, currentExercise?.exerciseId]);

  const handleExpire = useCallback(() => {
    void dispatch(expireBlock());
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
      navigate(`/writing/scramble/result/${blockId}${timedOut ? '?timedOut=1' : ''}`, { replace: true });
    }
  }, [finished, timedOut, blockId, navigate]);

  // Debounced автосохранение черновика — не долбим бэкенд на каждое перетаскивание
  useEffect(() => {
    if (currentExercise === null) return undefined;
    if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);

    draftTimerRef.current = window.setTimeout(() => {
      void dispatch(saveDraft({ exerciseId: currentExercise.exerciseId, wordOrder: line, usedHint: false }));
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, currentExercise?.exerciseId]);

  const goTo = useCallback((index: number) => {
    dispatch(setActiveIndex(index));
    setReviewOpen(false);
  }, [dispatch]);

  const handleExit = useCallback(() => {
    dispatch(resetScramble());
    navigate('/writing/scramble', { replace: true });
  }, [dispatch, navigate]);

  const handleFinish = useCallback(() => {
    void dispatch(finishBlock());
  }, [dispatch]);

  if (currentExercise === null || totalTimeBudgetSec === null) {
    return <FullPageSpinner label={t('scramble.loadingExercise')} />;
  }

  const answeredSet = new Set(Object.keys(drafts).filter((id) => drafts[id]!.wordOrder.length > 0));
  const answeredCount = items.filter((it) => answeredSet.has(it.exerciseId)).length;
  const isTimeWarning = remainingSec !== null && remainingSec <= 60;
  const tiles = currentExercise.words.tiles.map((w) => ({ id: w.id, word: w.word }));
  const isLastItem = activeIndex === items.length - 1;

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <span className={styles['sectionLabel']}>{t('scramble.exam.sectionLabel')}</span>
        <span className={`${styles['timer']} ${isTimeWarning ? styles['timerWarn'] : ''}`}>
          {remainingSec !== null ? formatTime(remainingSec) : '--:--'}
        </span>
        <button type="button" className={styles['exitBtn']} onClick={handleExit} aria-label="Exit">
          <X size={18} />
        </button>
      </header>

      <nav className={styles['itemNav']} aria-label={t('scramble.exam.itemNavLabel')}>
        {items.map((it, idx) => {
          const isAnswered = answeredSet.has(it.exerciseId);
          const isActive = idx === activeIndex;
          return (
            <button
              key={it.exerciseId}
              type="button"
              className={[
                styles['itemDot'],
                isActive ? styles['itemDotActive'] : '',
                isAnswered ? styles['itemDotAnswered'] : '',
              ].join(' ')}
              onClick={() => goTo(idx)}
              aria-current={isActive}
            >
              {isAnswered && !isActive ? <Check size={12} /> : idx + 1}
            </button>
          );
        })}
      </nav>

      <div className={styles['promptCard']}>{currentExercise.prompt}</div>

      {error !== null && <p className={styles['errorText']}>{error}</p>}

      <WordArrangeBoard
        words={tiles}
        bank={bank}
        line={line}
        onBankChange={setBank}
        onLineChange={setLine}
        labels={{
          yourSentence: t('scramble.yourSentence'),
          wordBank: t('scramble.wordBank'),
          dropHere: t('scramble.dropHere'),
        }}
      />

      <p className={styles['noHints']}>{t('scramble.exam.noHintsNotice')}</p>

      <footer className={styles['footer']}>
        <button type="button" className={styles['navBtn']} disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)}>
          <ChevronLeft size={16} /> {t('scramble.exam.back')}
        </button>

        <button type="button" className={styles['reviewBtn']} onClick={() => setReviewOpen(true)}>
          <LayoutGrid size={15} />
          {t('scramble.exam.review')} ({answeredCount}/{items.length})
        </button>

        {isLastItem ? (
          <button type="button" className={styles['finishBtn']} onClick={handleFinish} disabled={isSubmitting}>
            {isSubmitting ? t('scramble.exam.submitting') : t('scramble.exam.finishTest')}
          </button>
        ) : (
          <button type="button" className={styles['navBtn']} onClick={() => goTo(activeIndex + 1)}>
            {t('scramble.exam.forward')} <ChevronRight size={16} />
          </button>
        )}
      </footer>

      {reviewOpen && (
        <div className={styles['reviewOverlay']} role="dialog" aria-modal="true">
          <div className={styles['reviewPanel']}>
            <div className={styles['reviewPanelHead']}>
              <h2>{t('scramble.exam.reviewTitle')}</h2>
              <button type="button" className={styles['exitBtn']} onClick={() => setReviewOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className={styles['reviewGrid']}>
              {items.map((it, idx) => {
                const isAnswered = answeredSet.has(it.exerciseId);
                return (
                  <button
                    key={it.exerciseId}
                    type="button"
                    className={[styles['reviewCell'], isAnswered ? styles['reviewCellAnswered'] : styles['reviewCellEmpty']].join(' ')}
                    onClick={() => goTo(idx)}
                  >
                    <span className={styles['reviewCellNum']}>{idx + 1}</span>
                    <span className={styles['reviewCellStatus']}>
                      {isAnswered ? t('scramble.exam.answered') : t('scramble.exam.notAnswered')}
                    </span>
                  </button>
                );
              })}
            </div>
            <button type="button" className={styles['finishBtn']} onClick={handleFinish} disabled={isSubmitting}>
              {isSubmitting ? t('scramble.exam.submitting') : t('scramble.exam.finishTest')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}