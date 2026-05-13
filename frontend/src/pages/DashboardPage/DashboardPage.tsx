import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Flame,
  Zap,
  BookOpen,
  PenLine,
  Headphones,
  Mic,
  CheckCheck,
  Layers,
  Trophy,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import {
  fetchDashboard,
  requestLevelUp,
  selectProgressData,
  selectProgressIsLoading,
  selectProgressError,
  selectIsLevelingUp,
} from '@/store/Slices/ProgressSlice';
import type { DailyActivity, LevelProgressData } from '@/types/progress/Progress.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './DashboardPage.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface SkillProgress {
  pct: number;
  label: string;
}

function getSkillProgress(key: string, progress: LevelProgressData): SkillProgress {
  switch (key) {
    case 'grammar': {
      const { completed, required, accuracy } = progress.grammar;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, label: `${completed}/${required} · ${accuracy}% acc` };
    }
    case 'reading': {
      const { completed, required, accuracy } = progress.reading;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, label: `${completed}/${required} · ${accuracy}% acc` };
    }
    case 'listening': {
      const { completed, required, accuracy } = progress.listening;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, label: `${completed}/${required} · ${accuracy}% acc` };
    }
    case 'vocabulary': {
      const { learned, required } = progress.vocabulary;
      const pct = required > 0 ? Math.min(100, Math.round((learned / required) * 100)) : 0;
      return { pct, label: `${learned}/${required} words` };
    }
    case 'writing': {
      const { completed, required, avgScore } = progress.writing;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, label: `${completed}/${required} · avg ${avgScore}%` };
    }
    case 'multipleChoice': {
      const { completed, required, avgScore } = progress.multipleChoice;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, label: `${completed}/${required} · avg ${avgScore}%` };
    }
    default:
      return { pct: 0, label: 'Coming soon' };
  }
}

function buildWeekDots(recentActivity: DailyActivity[]) {
  const activitySet = new Set(recentActivity.map((a) => a.date));
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

  return Array.from({ length: 7 }, (_, offset) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - offset));
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      label: DAY_LABELS[d.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6],
      active: activitySet.has(date),
    };
  });
}


const SKILL_CONFIGS = [
  { key: 'grammar', Icon: CheckCheck, labelKey: 'dashboard.features.grammar', color: '#14b8a6', comingSoon: false },
  { key: 'reading', Icon: BookOpen, labelKey: 'dashboard.features.reading', color: '#22c55e', comingSoon: false },
  { key: 'listening', Icon: Headphones, labelKey: 'dashboard.features.listening', color: '#f59e0b', comingSoon: false },
  { key: 'vocabulary', Icon: Layers, labelKey: 'dashboard.features.vocabulary', color: '#8b5cf6', comingSoon: false },
  { key: 'writing', Icon: PenLine, labelKey: 'dashboard.features.writing', color: '#ec4899', comingSoon: false },
  { key: 'speaking', Icon: Mic, labelKey: 'dashboard.features.speaking', color: '#6366f1', comingSoon: true },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function GreetingMessage({ name }: { name: string }) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const periodKey =
    hour < 12 ? 'dashboard.morning' :
      hour < 18 ? 'dashboard.afternoon' :
        'dashboard.evening';

  return (
    <div className={styles['greetingBlock']}>
      <h1 className={styles['greeting']}>
        {t(periodKey)}, <span className={styles['greetingName']}>{name.split(' ')[0]}</span>
      </h1>
      <p className={styles['greetingSubtitle']}>{t('dashboard.subtitle')}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const data = useAppSelector(selectProgressData);
  const isLoading = useAppSelector(selectProgressIsLoading);
  const error = useAppSelector(selectProgressError);
  const isLevelingUp = useAppSelector(selectIsLevelingUp);


  useEffect(() => {
    if (data === null && !isLoading && error === null) {
      void dispatch(fetchDashboard());
    }
  }, [data, isLoading, error, dispatch]);

  const handleRetry = useCallback(() => {
    void dispatch(fetchDashboard());
  }, [dispatch]);

  const handleLevelUp = useCallback(async () => {
    const result = await dispatch(requestLevelUp());
    if (requestLevelUp.fulfilled.match(result)) {
      // data was cleared in slice reducer — the useEffect above will re-fetch
    }
  }, [dispatch]);

  // Guaranteed by ProtectedRoute
  if (user === null) {
    return null;
  }

  if (isLoading && data === null) {
    return <FullPageSpinner label="Loading your progress…" />;
  }

  return (
    <div className={styles['page']}>
      {/* ── Header ── */}
      <header className={styles['header']}>
        <GreetingMessage name={user.name} />
        {user.role === 'ADMIN' && (
          <span className={styles['adminBadge']}>{t('dashboard.admin')}</span>
        )}
      </header>

      {/* ── Error banner ── */}
      {error !== null && (
        <div className={styles['errorBanner']}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" onClick={handleRetry} className={styles['retryBtn']}>
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {data !== null && (
        <>
          {/* ── Quick stats ── */}
          <div className={styles['statsGrid']}>
            <div className={styles['statCard']}>
              <div className={`${styles['statIcon']} ${styles['purple']}`}>
                <TrendingUp size={18} />
              </div>
              <div className={styles['statInfo']}>
                <span className={styles['statValue']}>{data.currentLevel}</span>
                <span className={styles['statLabel']}>{t('dashboard.statLevel')}</span>
              </div>
            </div>

            <div className={styles['statCard']}>
              <div className={`${styles['statIcon']} ${styles['amber']}`}>
                <Flame size={18} />
              </div>
              <div className={styles['statInfo']}>
                <span className={styles['statValue']}>{data.streak}</span>
                <span className={styles['statLabel']}>{t('dashboard.statStreak')}</span>
              </div>
            </div>

            <div className={styles['statCard']}>
              <div className={`${styles['statIcon']} ${styles['green']}`}>
                <Zap size={18} />
              </div>
              <div className={styles['statInfo']}>
                <span className={styles['statValue']}>{data.totalXp.toLocaleString()}</span>
                <span className={styles['statLabel']}>Total XP</span>
              </div>
            </div>
          </div>

          {/* ── Level readiness ── */}
          <section className={styles['readinessSection']}>
            <div className={styles['sectionHeader']}>
              <h2 className={styles['sectionTitle']}>Readiness for next level</h2>
              <span className={styles['sectionMeta']}>{data.readinessPercent}%</span>
            </div>
            <div className={styles['readinessTrack']}>
              <div
                className={styles['readinessFill']}
                style={{ width: `${data.readinessPercent}%` }}
              />
            </div>
            {data.progress.isReadyForTest && (
              <button
                type="button"
                className={styles['levelUpBtn']}
                onClick={() => { void handleLevelUp(); }}
                disabled={isLevelingUp}
              >
                <Trophy size={16} />
                {isLevelingUp ? 'Leveling up…' : 'Level Up!'}
              </button>
            )}
          </section>

          {/* ── Weekly activity ── */}
          <section className={styles['progressSection']}>
            <div className={styles['sectionHeader']}>
              <h2 className={styles['sectionTitle']}>{t('dashboard.weeklyGoal')}</h2>
              <span className={styles['sectionMeta']}>
                {data.recentActivity.length > 0
                  ? `${Math.min(data.recentActivity.filter((a) => {
                    const d = new Date();
                    const cutoff = new Date(d.setDate(d.getDate() - 7)).toISOString().slice(0, 10);
                    return a.date >= cutoff;
                  }).length, 7)} / 7 ${t('dashboard.days')}`
                  : `0 / 7 ${t('dashboard.days')}`}
              </span>
            </div>
            <div className={styles['weekDots']}>
              {buildWeekDots(data.recentActivity).map(({ date, label, active }) => (
                <div key={date} className={styles['weekDot']}>
                  <div className={`${styles['dot']} ${active ? styles['dotActive'] : ''}`} />
                  <span className={styles['dotLabel']}>{label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Skills grid ── */}
          <section>
            <div className={styles['sectionHeader']}>
              <h2 className={styles['sectionTitle']}>{t('dashboard.practiceAreas')}</h2>
            </div>
            <div className={styles['sectionGrid']}>
              {SKILL_CONFIGS.map(({ key, Icon, labelKey, color, comingSoon }) => {
                const skillProgress = comingSoon
                  ? { pct: 0, label: 'Coming soon' }
                  : getSkillProgress(key, data.progress);

                return (
                  <div key={key} className={styles['sectionCard']}>
                    <div className={styles['sectionCardTop']}>
                      <div
                        className={styles['sectionIconWrap']}
                        style={{ '--card-color': color } as React.CSSProperties}
                      >
                        <Icon size={20} />
                      </div>
                      {comingSoon && (
                        <span className={styles['comingSoon']}>{t('dashboard.comingSoon')}</span>
                      )}
                    </div>
                    <h3 className={styles['sectionName']}>{t(labelKey)}</h3>
                    <div className={styles['sectionProgress']}>
                      <div className={styles['sectionProgressTrack']}>
                        <div
                          className={styles['sectionProgressFill']}
                          style={{ width: `${skillProgress.pct}%`, backgroundColor: comingSoon ? undefined : color }}
                        />
                      </div>
                      <span className={styles['sectionProgressLabel']}>{skillProgress.pct}%</span>
                    </div>
                    <p className={styles['skillDetail']}>{skillProgress.label}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}