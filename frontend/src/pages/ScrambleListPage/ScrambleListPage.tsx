import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, ChevronRight, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import { startPracticeSet, startExam } from '@/store/Slices/ScrambleSlice';
import { LEVEL_DISPLAY, getLevelColor } from '@/constants/level';
import type { Level } from '@/types/globalTypes';
import type { ScrambleBlockStart } from '@/types/scramble/Scramble.types';
import styles from './ScrambleListPage.module.css';

const GUIDED_LEVELS: Level[] = ['A1', 'A1_PLUS', 'A2', 'A2_PLUS'] as Level[];
const STRICT_LEVELS: Level[] = ['B1', 'B1_PLUS', 'B2', 'B2_PLUS', 'C1', 'C2'] as Level[];
const PRACTICE_SET_SIZE = 10;

function routeFor(data: ScrambleBlockStart): string {
  return data.freeNavigation
    ? `/writing/scramble/block/${data.blockId}`
    : `/writing/scramble/session/${data.blockId}`;
}

export default function ScrambleHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isStarting = useAppSelector((s) => s.scramble.isStarting);
  const error = useAppSelector((s) => s.scramble.error);

  const handleStartLevel = useCallback(
    async (level: Level) => {
      try {
        const data = await dispatch(startPracticeSet({ level, count: PRACTICE_SET_SIZE })).unwrap();
        navigate(routeFor(data));
      } catch {
      }
    },
    [dispatch, navigate],
  );

  const handleStartExam = useCallback(async () => {
    try {
      const data = await dispatch(startExam()).unwrap();
      navigate(routeFor(data));
    } catch {
    }
  }, [dispatch, navigate]);

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <h1 className={styles['pageTitle']}>{t('scramble.title')}</h1>
        <p className={styles['pageSubtitle']}>{t('scramble.subtitle')}</p>
      </header>

      <button type="button" className={styles['examCard']} onClick={() => { void handleStartExam(); }} disabled={isStarting}>
        <div className={styles['examCardIco']}>
          <FileText size={22} />
        </div>
        <div className={styles['examCardBody']}>
          <span className={styles['examCardTitle']}>{t('scramble.exam.cardTitle')}</span>
          <span className={styles['examCardDesc']}>{t('scramble.exam.cardDesc')}</span>
        </div>
        <ChevronRight size={18} className={styles['examCardArrow']} />
      </button>

      {error !== null && <p className={styles['errorText']}>{error}</p>}

      <section className={styles['levelSection']}>
        <div className={styles['levelSectionHead']}>
          <Sparkles size={16} />
          <h2 className={styles['levelSectionTitle']}>{t('scramble.levels.guidedTitle')}</h2>
        </div>
        <p className={styles['levelSectionDesc']}>{t('scramble.levels.guidedDesc')}</p>
        <div className={styles['levelGrid']}>
          {GUIDED_LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={styles['levelChip']}
              style={{ '--level-color': getLevelColor(lv) } as React.CSSProperties}
              onClick={() => { void handleStartLevel(lv); }}
              disabled={isStarting}
            >
              <span className={styles['levelChipLabel']}>{LEVEL_DISPLAY[lv]}</span>
              {user?.currentLevel === lv && <span className={styles['levelChipYou']}>{t('scramble.levels.yourLevel')}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className={styles['levelSection']}>
        <div className={styles['levelSectionHead']}>
          <FileText size={16} />
          <h2 className={styles['levelSectionTitle']}>{t('scramble.levels.strictTitle')}</h2>
        </div>
        <p className={styles['levelSectionDesc']}>{t('scramble.levels.strictDesc')}</p>
        <div className={styles['levelGrid']}>
          {STRICT_LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={styles['levelChip']}
              style={{ '--level-color': getLevelColor(lv) } as React.CSSProperties}
              onClick={() => { void handleStartLevel(lv); }}
              disabled={isStarting}
            >
              <span className={styles['levelChipLabel']}>{LEVEL_DISPLAY[lv]}</span>
              {user?.currentLevel === lv && <span className={styles['levelChipYou']}>{t('scramble.levels.yourLevel')}</span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}