import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Brain, Flame, Layers, Trophy, Zap } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { fetchVocabProgress, selectVocabProgress } from '@/store/Slices/VocabularySlice';
import { StudySession } from './StudySession/StudySession';
import { BrowseMode } from './BrowseMode/BrowseMode';
import styles from './VocabularyPage.module.css';
import { useState } from 'react';


function CircleProgress({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}


function ProgressHeader() {
  const { t } = useTranslation('vocabulary');
  const progress = useAppSelector(selectVocabProgress);
  if (progress === null) return null;

  const learnedPct = progress.total > 0 ? Math.round((progress.learned / progress.total) * 100) : 0;
  const masteredPct = progress.total > 0 ? Math.round((progress.mastered / progress.total) * 100) : 0;

  return (
    <div className={styles['progressStrip']}>
      <div className={styles['progressRingWrap']}>
        <CircleProgress pct={learnedPct} color="#6366f1" size={52} />
        <span className={styles['progressRingLabel']}>{learnedPct}%</span>
      </div>

      <div className={styles['progressStats']}>
        <div className={styles['progressStat']}>
          <Brain size={13} className={styles['statIconNeutral']} />
          <span className={styles['statNum']}>{progress.total.toLocaleString()}</span>
          <span className={styles['statLabel']}>{t('progress.total')}</span>
        </div>
        <div className={styles['progressStatDivider']} />
        <div className={styles['progressStat']}>
          <Zap size={13} className={styles['statIconBlue']} />
          <span className={`${styles['statNum']} ${styles['statNumBlue']}`}>{progress.learned}</span>
          <span className={styles['statLabel']}>{t('progress.learned')}</span>
        </div>
        <div className={styles['progressStatDivider']} />
        <div className={styles['progressStat']}>
          <Trophy size={13} className={styles['statIconGreen']} />
          <span className={`${styles['statNum']} ${styles['statNumGreen']}`}>{progress.mastered}</span>
          <span className={styles['statLabel']}>{t('progress.mastered')}</span>
        </div>
        {progress.dueToday > 0 && (
          <>
            <div className={styles['progressStatDivider']} />
            <div className={`${styles['progressStat']} ${styles['progressStatDue']}`}>
              <Flame size={13} />
              <span className={styles['statNum']}>{progress.dueToday}</span>
              <span className={styles['statLabel']}>{t('progress.due')}</span>
            </div>
          </>
        )}
      </div>

      <div className={styles['progressBarCol']}>
        <div className={styles['progressBarRow']}>
          <span className={styles['progressBarLabelSmall']}>{t('progress.learned')}</span>
          <div className={styles['progressBar']}>
            <div className={styles['progressBarFillBlue']} style={{ width: `${learnedPct}%` }} />
          </div>
          <span className={styles['progressBarPct']}>{learnedPct}%</span>
        </div>
        <div className={styles['progressBarRow']}>
          <span className={styles['progressBarLabelSmall']}>{t('progress.mastered')}</span>
          <div className={styles['progressBar']}>
            <div className={styles['progressBarFillGreen']} style={{ width: `${masteredPct}%` }} />
          </div>
          <span className={styles['progressBarPct']}>{masteredPct}%</span>
        </div>
      </div>
    </div>
  );
}


type PageMode = 'study' | 'browse';

export function VocabularyPage() {
  const { t } = useTranslation('vocabulary');
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<PageMode>('study');

  useEffect(() => {
    void dispatch(fetchVocabProgress());
  }, [dispatch]);

  return (
    <div className={styles['page']}>
      <header className={styles['pageHeader']}>
        <div className={styles['pageHeaderLeft']}>
          <div className={styles['pageIcon']}>
            <Layers size={20} />
          </div>
          <div>
            <h1 className={styles['pageTitle']}>{t('title')}</h1>
            <p className={styles['pageSubtitle']}>{t('subtitle')}</p>
          </div>
        </div>
      </header>

      <ProgressHeader />

      <div className={styles['modeSwitcher']} role="tablist" aria-label={t('modeLabel')}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'study'}
          className={`${styles['modeTab']} ${mode === 'study' ? styles['modeTabActive'] : ''}`}
          onClick={() => setMode('study')}
        >
          <Brain size={15} />
          {t('study')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'browse'}
          className={`${styles['modeTab']} ${mode === 'browse' ? styles['modeTabActive'] : ''}`}
          onClick={() => setMode('browse')}
        >
          <BookOpen size={15} />
          {t('browse')}
        </button>
      </div>

      <div className={styles['content']}>{mode === 'study' ? <StudySession /> : <BrowseMode />}</div>
    </div>
  );
}