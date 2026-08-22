import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, Play, Clock, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchSpeakingSets,
  startSpeakingSession,
  selectSpeakingSets,
  selectSpeakingSetsLoading,
} from '@/store/Slices/SpeakingRepeatSlice';
import { FullPageSpinner } from '@/components/ui/Spinner';
import  { Level } from '@/types/globalTypes';
import styles from './SpeakingListenRepeatListPage.module.css';

const LEVELS: Level[] = [
  Level.A1,
  Level.A1_PLUS,
  Level.A2,
  Level.A2_PLUS,
  Level.B1,
  Level.B1_PLUS,
  Level.B2,
  Level.B2_PLUS,
  Level.C1,
  Level.C2,
];
const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+', C1: 'C1', C2: 'C2',
};

export default function SpeakingListenRepeatListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [level, setLevel] = useState<Level>(Level.B1);
  const sets = useAppSelector(selectSpeakingSets);
  const isLoading = useAppSelector(selectSpeakingSetsLoading);

  useEffect(() => {
    void dispatch(fetchSpeakingSets(level));
  }, [dispatch, level]);

  const handleStart = async (setId: string, scenario: string) => {
    await dispatch(startSpeakingSession({ setId, scenario }));
    navigate('/speaking/listen-and-repeat/session');
  };

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <h1 className={styles['pageTitle']}>
          <Mic size={22} className={styles['pageTitleIcon']} />
          {t('speaking.listenRepeat.title')}
        </h1>
        <p className={styles['pageSubtitle']}>{t('speaking.listenRepeat.subtitle')}</p>
      </header>

      <div className={styles['filterBar']}>
        <span className={styles['filterLabel']}>{t('speaking.listenRepeat.filters.level')}</span>
        <div className={styles['chips']}>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`${styles['chip']} ${level === lv ? styles['chipActive'] : ''}`}
              onClick={() => setLevel(lv)}
            >
              {LEVEL_DISPLAY[lv]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && sets.length === 0 ? (
        <FullPageSpinner label={t('speaking.listenRepeat.loading')} />
      ) : sets.length === 0 ? (
        <div className={styles['emptyState']}>
          <Mic size={52} className={styles['emptyIcon']} />
          <p className={styles['emptyTitle']}>{t('speaking.listenRepeat.empty.title')}</p>
          <p className={styles['emptyHint']}>{t('speaking.listenRepeat.empty.hint')}</p>
        </div>
      ) : (
        <div className={styles['grid']}>
          {sets.map((set) => {
            const shortCount = set.items.filter((i) => i.difficulty === 'SHORT').length;
            const mediumCount = set.items.filter((i) => i.difficulty === 'MEDIUM').length;
            const longCount = set.items.filter((i) => i.difficulty === 'LONG').length;

            return (
              <article key={set.id} className={styles['setCard']}>
                <div className={styles['setCardTop']}>
                  <span className={styles['levelBadge']}>{LEVEL_DISPLAY[set.level] ?? set.level}</span>
                  <span className={styles['itemCount']}>
                    <Clock size={12} />
                    {set.items.length} {t('speaking.listenRepeat.items')}
                  </span>
                </div>
                <h3 className={styles['scenario']}>{set.scenario}</h3>
                <div className={styles['difficultyDots']}>
                  <span className={styles['dotGroup']}>
                    <span className={`${styles['dot']} ${styles['dotShort']}`} />
                    {shortCount}
                  </span>
                  <span className={styles['dotGroup']}>
                    <span className={`${styles['dot']} ${styles['dotMedium']}`} />
                    {mediumCount}
                  </span>
                  <span className={styles['dotGroup']}>
                    <span className={`${styles['dot']} ${styles['dotLong']}`} />
                    {longCount}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles['startBtn']}
                  onClick={() => { void handleStart(set.id, set.scenario); }}
                >
                  <Play size={14} />
                  {t('speaking.listenRepeat.start')}
                  <ChevronRight size={14} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}