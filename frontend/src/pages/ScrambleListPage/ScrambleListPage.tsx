import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shuffle, Play, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { fetchScrambleCatalog, setFilter, startQueue } from '@/./store/Slices/ScrambleSlice';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './ScrambleListPage.module.css';

const LEVELS = ['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'B2_PLUS', 'C1', 'C2'];
const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+', C1: 'C1', C2: 'C2',
};

const SESSION_SIZE = 10;

export default function ScrambleListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { catalog, catalogLoading, catalogError, filters } = useAppSelector((s) => s.scramble);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.level !== null) params['level'] = filters.level;
    void dispatch(fetchScrambleCatalog(Object.keys(params).length > 0 ? params : undefined));
  }, [dispatch, filters.level]);

  const handleRetry = useCallback(() => {
    void dispatch(fetchScrambleCatalog());
  }, [dispatch]);

  const handleStartSession = (startId?: string) => {
    const pool = startId !== undefined
      ? catalog.filter((c) => c.id === startId)
      : catalog.filter((c) => c.userStatus !== 'completed').length > 0
        ? catalog.filter((c) => c.userStatus !== 'completed')
        : catalog;

    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, SESSION_SIZE);
    if (shuffled.length === 0) return;

    dispatch(startQueue(shuffled));
    navigate('/writing/scramble/session');
  };

  if (catalogLoading && catalog.length === 0) {
    return <FullPageSpinner label={t('scramble.loading')} />;
  }

  const notCompleted = catalog.filter((c) => c.userStatus !== 'completed').length;

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <div>
          <h1 className={styles['pageTitle']}>
            <Shuffle size={22} className={styles['pageTitleIcon']} />
            {t('scramble.title')}
          </h1>
          <p className={styles['pageSubtitle']}>{t('scramble.subtitle')}</p>
        </div>
        {catalog.length > 0 && (
          <button type="button" className={styles['startBtn']} onClick={() => handleStartSession()}>
            <Play size={16} />
            {t('scramble.startPractice', { count: Math.min(SESSION_SIZE, notCompleted || catalog.length) })}
          </button>
        )}
      </header>

      <div className={styles['filterBar']}>
        <span className={styles['filterLabel']}>{t('scramble.filters.level')}</span>
        <div className={styles['chips']}>
          <button
            type="button"
            className={`${styles['chip']} ${filters.level === null ? styles['chipActive'] : ''}`}
            onClick={() => dispatch(setFilter({ key: 'level', value: null }))}
          >
            {t('scramble.filters.allLevels')}
          </button>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`${styles['chip']} ${filters.level === lv ? styles['chipActive'] : ''}`}
              onClick={() => dispatch(setFilter({ key: 'level', value: filters.level === lv ? null : lv }))}
            >
              {LEVEL_DISPLAY[lv]}
            </button>
          ))}
        </div>
      </div>

      {catalogError !== null && (
        <div className={styles['errorBanner']}>
          <AlertCircle size={15} />
          <span>{t('scramble.error')}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={13} /> {t('scramble.retry')}
          </button>
        </div>
      )}

      {!catalogLoading && catalogError === null && catalog.length === 0 && (
        <div className={styles['emptyState']}>
          <Shuffle size={52} className={styles['emptyIcon']} />
          <p className={styles['emptyTitle']}>{t('scramble.empty.title')}</p>
          <p className={styles['emptyHint']}>{t('scramble.empty.hint')}</p>
        </div>
      )}

      <div className={styles['grid']}>
        {catalog.map((ex) => (
          <article key={ex.id} className={styles['exCard']}>
            <div className={styles['exCardTop']}>
              <span className={styles['levelBadge']}>{LEVEL_DISPLAY[ex.level] ?? ex.level}</span>
              {ex.userStatus === 'completed' && (
                <span className={styles['statusDone']}>
                  <CheckCircle2 size={12} />
                  {ex.bestScore !== null ? `${ex.bestScore}%` : t('scramble.status.completed')}
                </span>
              )}
              {ex.userStatus === 'in_progress' && (
                <span className={styles['statusProgress']}><Clock size={12} />{t('scramble.status.inProgress')}</span>
              )}
            </div>
            <p className={styles['exTopic']}>#{ex.topic}</p>
            <p className={styles['exMeta']}>{ex.wordCount} {t('scramble.wordsCount')}</p>
            <button type="button" className={styles['exStartBtn']} onClick={() => handleStartSession(ex.id)}>
              <Play size={13} />
              {t('scramble.practiceThis')}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}