import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, Search, RefreshCw, CheckCircle2, PlayCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { fetchSpeakingSets, setSpeakingFilter } from '@/store/Slices/SpeakingRepeatSlice';
import { speakingRepeatApi } from '@/api/services/speaking-repeat';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './SpeakingListPage.module.css';

const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
  C1: 'C1', C2: 'C2',
};

const LEVELS = Object.keys(LEVEL_DISPLAY);

export default function SpeakingListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sets, setsLoading, setsError, filters } = useAppSelector((s) => s.speakingRepeat);

  const [scenarios, setScenarios] = useState<string[]>([]);

  useEffect(() => {
    void dispatch(fetchSpeakingSets({
      level: filters.level || null,
      scenario: filters.scenario ,
    }));
  }, [dispatch, filters.level, filters.scenario]);

  useEffect(() => {
    let cancelled = false;
    void speakingRepeatApi.getScenarios(filters.level ?? undefined).then(({ data }) => {
      if (!cancelled) setScenarios(data);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [filters.level]);

  const handleRetry = () => {
    void dispatch(fetchSpeakingSets({
      level: filters.level,
      scenario: filters.scenario,
    }));
  };

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <div>
          <h1 className={styles['title']}>{t('speaking.repeat.title')}</h1>
          <p className={styles['subtitle']}>{t('speaking.repeat.subtitle')}</p>
        </div>
      </header>

      <div className={styles['filters']}>
        <div className={styles['searchBox']}>
          <Search size={15} className={styles['searchIcon']} />
          <select
            className={styles['scenarioSelect']}
            value={filters.scenario}
            onChange={(e) => dispatch(setSpeakingFilter({ key: 'scenario', value: e.target.value }))}
          >
            <option value="">{t('speaking.repeat.filters.allScenarios')}</option>
            {scenarios.map((sc) => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
          </select>
        </div>

        <div className={styles['levelChips']}>
          <button
            type="button"
            className={`${styles['chip']} ${filters.level === null ? styles['chipActive'] : ''}`}
            onClick={() => dispatch(setSpeakingFilter({ key: 'level', value: null }))}
          >
            {t('speaking.repeat.filters.allLevels')}
          </button>
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`${styles['chip']} ${filters.level === lvl ? styles['chipActive'] : ''}`}
              onClick={() => dispatch(setSpeakingFilter({ key: 'level', value: lvl }))}
            >
              {LEVEL_DISPLAY[lvl]}
            </button>
          ))}
        </div>
      </div>

      {setsLoading && <FullPageSpinner label={t('speaking.repeat.loading')} />}

      {!setsLoading && setsError !== null && (
        <div className={styles['errorState']}>
          <p>{setsError}</p>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={14} /> {t('speaking.repeat.retry')}
          </button>
        </div>
      )}

      {!setsLoading && setsError === null && sets.length === 0 && (
        <div className={styles['emptyState']}>
          <Mic size={32} className={styles['emptyIcon']} />
          <h3>{t('speaking.repeat.empty.title')}</h3>
          <p>{t('speaking.repeat.empty.hint')}</p>
        </div>
      )}

      {!setsLoading && setsError === null && sets.length > 0 && (
        <div className={styles['grid']}>
          {sets.map((set) => (
            <button
              key={set.id}
              type="button"
              className={styles['card']}
              onClick={() => navigate(`/speaking/${set.id}`)}
            >
              <div className={styles['cardMedia']}>
                {set.imageUrl !== null ? (
                  <img src={set.imageUrl} alt="" className={styles['cardImage']} loading="lazy" />
                ) : (
                  <div className={styles['cardMediaFallback']}>
                    <Mic size={28} />
                  </div>
                )}
                <span className={styles['levelBadge']}>{LEVEL_DISPLAY[set.level] ?? set.level}</span>
              </div>

              <div className={styles['cardBody']}>
                <h3 className={styles['cardTitle']}>{set.scenario}</h3>
                <span className={styles['cardMeta']}>
                  {t('speaking.repeat.itemCount', { count: set.itemCount })}
                </span>

                <div className={styles['cardFooter']}>
                  {set.userStatus === 'completed' && (
                    <span className={styles['statusCompleted']}>
                      <CheckCircle2 size={13} />
                      {set.bestScore !== null
                        ? t('speaking.repeat.bestScore', { score: set.bestScore })
                        : t('speaking.repeat.status.completed')}
                    </span>
                  )}
                  {set.userStatus === 'in_progress' && (
                    <span className={styles['statusInProgress']}>
                      <PlayCircle size={13} />
                      {t('speaking.repeat.status.inProgress')}
                    </span>
                  )}
                  {set.userStatus === 'not_started' && (
                    <span className={styles['statusNew']}>{t('speaking.repeat.status.notStarted')}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}