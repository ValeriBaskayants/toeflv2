import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';
import type { GetExercisesParams } from '@/types/exercises/Exercise.types';

import { FullPageSpinner   } from '@/components/ui/Spinner';
import styles from './ExercisesPage.module.css';
import { selectExercisesListIsLoading, selectExercisesListError, selectActiveDifficulty, selectActiveTopic, fetchExercises, fetchExerciseTopics } from '@/store/Slices/ExercisesSlice';
import { selectActiveLevel } from '@/store/Slices/GrammarRulesSlice';
import { ExerciseList } from '../ExerciseList/ExerciseList';
import { ExerciseWorkspace } from '../ExerciseList/ExerciseWorkspace/ExerciseWorkspace';

export function ExercisesPage() {
  const { t }    = useTranslation('exercises');
  const dispatch = useAppDispatch();

  const isLoading   = useAppSelector(selectExercisesListIsLoading);
  const listError   = useAppSelector(selectExercisesListError);
  const activeLevel = useAppSelector(selectActiveLevel);
  const activeDiff  = useAppSelector(selectActiveDifficulty);
  const activeTopic = useAppSelector(selectActiveTopic);

  
  const allExercises    = useAppSelector((s) => s.exercises.list);
  const masteredCount   = allExercises.filter((e) => e.userStatus === 'mastered').length;
  const inProgressCount = allExercises.filter((e) => e.userStatus === 'in_progress').length;

  
  useEffect(() => {
    void dispatch(fetchExercises({ level: activeLevel ?? undefined }));
    void dispatch(fetchExerciseTopics(activeLevel ?? undefined));
  
  }, [dispatch]);

  
  useEffect(() => {
    void dispatch(fetchExercises({
      level:      activeLevel ?? undefined,
      difficulty: activeDiff  ?? undefined,
      topic:      activeTopic ?? undefined,
    }));
  }, [activeLevel, activeDiff, activeTopic, dispatch]);

  const handleRetryLoad = useCallback(() => {
    void dispatch(fetchExercises({
      level:      activeLevel ?? undefined,
      difficulty: activeDiff  ?? undefined,
      topic:      activeTopic ?? undefined,
    }));
  }, [activeLevel, activeDiff, activeTopic, dispatch]);

  if (isLoading && allExercises.length === 0) {
    return <FullPageSpinner label={t('loading')} />;
  }

  return (
    <div className={styles['page']}>
      {/* ── Header ── */}
      <header className={styles['pageHeader']}>
        <div className={styles['headerText']}>
          <h1 className={styles['pageTitle']}>{t('title')}</h1>
          <p className={styles['pageSubtitle']}>{t('subtitle')}</p>
        </div>

        <div className={styles['headerStats']}>
          <div className={styles['statChip']}>
            <span className={styles['statNum']}>{allExercises.length}</span>
            <span className={styles['statLabel']}>{t('stats.total')}</span>
          </div>
          {inProgressCount > 0 && (
            <div className={clsx(styles['statChip'], styles['statChipBlue'])}>
              <span className={styles['statNum']}>{inProgressCount}</span>
              <span className={styles['statLabel']}>{t('stats.inProgress')}</span>
            </div>
          )}
          {masteredCount > 0 && (
            <div className={clsx(styles['statChip'], styles['statChipGreen'])}>
              <span className={styles['statNum']}>{masteredCount}</span>
              <span className={styles['statLabel']}>{t('stats.mastered')}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Global error banner ── */}
      {listError !== null && (
        <div className={styles['errorBanner']} role="alert">
          <AlertCircle size={16} />
          <span>{t('error.loadFailed')}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetryLoad}>
            <RefreshCw size={13} />
            {t('error.retry')}
          </button>
        </div>
      )}

      {/* ── Split layout ── */}
      <div className={styles['splitLayout']}>
        <ExerciseList />
        <main className={styles['mainPanel']}>
          <ExerciseWorkspace />
        </main>
      </div>
    </div>
  );
}