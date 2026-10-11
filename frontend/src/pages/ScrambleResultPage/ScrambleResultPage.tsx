import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { fetchBlockReview, resetScramble } from '@/store/Slices/ScrambleSlice';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './ScrambleResultPage.module.css';

export default function ScrambleResultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { blockId } = useParams<{ blockId: string }>();
  const [searchParams] = useSearchParams();
  const timedOut = searchParams.get('timedOut') === '1';

  const { review, reviewLoading, correctCount, finalScorePercent, xpEarned } = useAppSelector((s) => s.scramble);

  useEffect(() => {
    if (blockId !== undefined) {
      void dispatch(fetchBlockReview(blockId));
    }
  }, [blockId, dispatch]);

  const handleBack = () => {
    dispatch(resetScramble());
    navigate('/writing/scramble', { replace: true });
  };

  const totalItems = review?.items.length ?? 10;
  const displayCorrect = correctCount ?? review?.correctCount ?? 0;
  const displayScore = finalScorePercent ?? review?.finalScorePercent ?? 0;

  return (
    <div className={styles['page']}>
      <div className={styles['summary']}>
        <Trophy size={44} className={styles['trophyIcon']} />
        <h1 className={styles['title']}>{t('scramble.exam.resultTitle')}</h1>
        {timedOut && <p className={styles['timedOutNote']}>{t('scramble.exam.timesUp')}</p>}

        <div className={styles['scoreCircle']}>
          <span className={styles['scoreNum']}>{displayScore}%</span>
        </div>

        <p className={styles['scoreDetail']}>
          {displayCorrect} {t('scramble.exam.resultCorrect')} {t('scramble.exam.resultOutOf')} {totalItems}
        </p>

        {xpEarned !== null && xpEarned > 0 && <span className={styles['xpBadge']}>+{xpEarned} XP</span>}

        <button type="button" className={styles['backBtn']} onClick={handleBack}>
          {t('scramble.exam.backToScramble')}
        </button>
      </div>

      {reviewLoading && <FullPageSpinner label={t('scramble.loading')} />}

      {!reviewLoading && review !== null && (
        <div className={styles['reviewSection']}>
          <h2 className={styles['reviewTitle']}>{t('scramble.exam.reviewTitle')}</h2>
          <div className={styles['reviewList']}>
            {review.items.map((item, idx) => (
              <div key={idx} className={`${styles['reviewItem']} ${item.isCorrect ? styles['reviewItemOk'] : styles['reviewItemErr']}`}>
                <div className={styles['reviewItemHead']}>
                  {item.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{item.isCorrect ? t('scramble.exam.reviewCorrect') : t('scramble.exam.reviewIncorrect')}</span>
                  <span className={styles['reviewItemTime']}>
                    <Clock3 size={12} /> {Math.round(item.timeSpentSec)}s
                  </span>
                </div>
                <p className={styles['reviewPrompt']}>{item.prompt}</p>
                <p className={styles['reviewSentence']}>{item.correctSentence}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}