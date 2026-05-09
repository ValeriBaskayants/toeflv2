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
  Calendar,
  Target,
  BarChart2,
  Clock,
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
import styles from './ProgressPage.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_ORDER = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'] as const;

const SKILL_CONFIGS = [
  { key: 'grammar',    Icon: CheckCheck, label: 'Grammar',    color: '#14b8a6' },
  { key: 'reading',    Icon: BookOpen,   label: 'Reading',    color: '#22c55e' },
  { key: 'listening',  Icon: Headphones, label: 'Listening',  color: '#f59e0b' },
  { key: 'vocabulary', Icon: Layers,     label: 'Vocabulary', color: '#8b5cf6' },
  { key: 'writing',    Icon: PenLine,    label: 'Writing',    color: '#ec4899' },
  { key: 'quiz',       Icon: Target,     label: 'Quiz',       color: '#6366f1' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface SkillStats {
  pct: number;
  completed: number;
  required: number;
  secondary: string;
  accuracy: number;
}

function getSkillStats(key: string, progress: LevelProgressData): SkillStats {
  switch (key) {
    case 'grammar': {
      const { completed, required, accuracy } = progress.grammar;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, completed, required, secondary: `${accuracy}% accuracy`, accuracy };
    }
    case 'reading': {
      const { completed, required, accuracy } = progress.reading;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, completed, required, secondary: `${accuracy}% accuracy`, accuracy };
    }
    case 'listening': {
      const { completed, required, accuracy } = progress.listening;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, completed, required, secondary: `${accuracy}% accuracy`, accuracy };
    }
    case 'vocabulary': {
      const { learned, required } = progress.vocabulary;
      const pct = required > 0 ? Math.min(100, Math.round((learned / required) * 100)) : 0;
      return { pct, completed: learned, required, secondary: 'words mastered', accuracy: pct };
    }
    case 'writing': {
      const { completed, required, avgScore } = progress.writing;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, completed, required, secondary: `avg score ${avgScore}%`, accuracy: avgScore };
    }
    case 'quiz': {
      const { completed, required, accuracy } = progress.quiz;
      const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
      return { pct, completed, required, secondary: `${accuracy}% accuracy`, accuracy };
    }
    default:
      return { pct: 0, completed: 0, required: 0, secondary: '', accuracy: 0 };
  }
}

function buildActivityGrid(recentActivity: DailyActivity[]) {
  const activityMap = new Map<string, DailyActivity>();
  for (const a of recentActivity) {
    activityMap.set(a.date, a);
  }

  // Build 5 weeks × 7 days = 35 days back
  const cells: Array<{ date: string; xp: number; sessions: number; intensity: 0 | 1 | 2 | 3 | 4 }> = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const activity = activityMap.get(date);
    const xp = activity?.xpEarned ?? 0;
    const sessions = activity?.sessionsCount ?? 0;
    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (xp > 0) {
      if (xp < 30) { intensity = 1; }
      else if (xp < 80) { intensity = 2; }
      else if (xp < 150) { intensity = 3; }
      else { intensity = 4; }
    }
    cells.push({ date, xp, sessions, intensity });
  }
  return cells;
}

function getCurrentLevelIndex(level: string): number {
  const normalized = level.replace('_PLUS', '+');
  return LEVEL_ORDER.indexOf(normalized as typeof LEVEL_ORDER[number]);
}

function computeTotalMinutes(recentActivity: DailyActivity[]): number {
  return recentActivity.reduce((sum, a) => sum + a.minutesSpent, 0);
}

function computeActiveDays(recentActivity: DailyActivity[]): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return recentActivity.filter((a) => a.date >= cutoffStr && a.xpEarned > 0).length;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LevelJourney({ currentLevel, readinessPercent }: { currentLevel: string; readinessPercent: number }) {
  const levelIndex = getCurrentLevelIndex(currentLevel);

  return (
    <section className={styles['levelJourney']}>
      <div className={styles['sectionHeader']}>
        <h2 className={styles['sectionTitle']}>
          <TrendingUp size={16} />
          Level Journey
        </h2>
        <span className={styles['sectionMeta']}>{currentLevel} · {readinessPercent}% to next</span>
      </div>

      <div className={styles['levelTrack']}>
        {LEVEL_ORDER.map((lvl, idx) => {
          const isPast = idx < levelIndex;
          const isCurrent = idx === levelIndex;
          const isFuture = idx > levelIndex;
          return (
            <div key={lvl} className={styles['levelNode']}>
              <div
                className={`${styles['levelDot']} ${isPast ? styles['levelDotPast'] : ''} ${isCurrent ? styles['levelDotCurrent'] : ''} ${isFuture ? styles['levelDotFuture'] : ''}`}
              >
                {isPast && <span className={styles['levelCheck']}>✓</span>}
                {isCurrent && <span className={styles['levelPulse']} />}
              </div>
              <span className={`${styles['levelLabel']} ${isCurrent ? styles['levelLabelCurrent'] : ''}`}>{lvl}</span>
              {idx < LEVEL_ORDER.length - 1 && (
                <div className={`${styles['levelConnector']} ${isPast ? styles['levelConnectorPast'] : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Readiness bar */}
      <div className={styles['readinessWrap']}>
        <div className={styles['readinessTrack']}>
          <div
            className={styles['readinessFill']}
            style={{ width: `${readinessPercent}%` }}
          />
          <span className={styles['readinessPct']} style={{ left: `${Math.min(readinessPercent, 95)}%` }}>
            {readinessPercent}%
          </span>
        </div>
        <p className={styles['readinessHint']}>
          Complete all skill requirements to unlock the level test
        </p>
      </div>
    </section>
  );
}

function ActivityHeatmap({ recentActivity }: { recentActivity: DailyActivity[] }) {
  const cells = buildActivityGrid(recentActivity);
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // group into weeks (columns)
  const weeks: typeof cells[] = [];
  for (let w = 0; w < 5; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  return (
    <section className={styles['heatmapSection']}>
      <div className={styles['sectionHeader']}>
        <h2 className={styles['sectionTitle']}>
          <Calendar size={16} />
          Activity (35 days)
        </h2>
      </div>
      <div className={styles['heatmapGrid']}>
        <div className={styles['heatmapDayLabels']}>
          {DAY_LABELS.map((d) => (
            <span key={d} className={styles['heatmapDayLabel']}>{d[0]}</span>
          ))}
        </div>
        <div className={styles['heatmapCols']}>
          {weeks.map((week, wi) => (
            <div key={wi} className={styles['heatmapCol']}>
              {week.map((cell) => (
                <div
                  key={cell.date}
                  className={`${styles['heatmapCell']} ${styles[`heatmapIntensity${cell.intensity}`]}`}
                  title={cell.xp > 0 ? `${cell.date}: ${cell.xp} XP · ${cell.sessions} sessions` : cell.date}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles['heatmapLegend']}>
        <span className={styles['legendLabel']}>Less</span>
        {([0, 1, 2, 3, 4] as const).map((i) => (
          <div key={i} className={`${styles['legendCell']} ${styles[`heatmapIntensity${i}`]}`} />
        ))}
        <span className={styles['legendLabel']}>More</span>
      </div>
    </section>
  );
}

function SkillBreakdown({ progress }: { progress: LevelProgressData }) {
  return (
    <section className={styles['skillBreakdown']}>
      <div className={styles['sectionHeader']}>
        <h2 className={styles['sectionTitle']}>
          <BarChart2 size={16} />
          Skill Breakdown
        </h2>
      </div>
      <div className={styles['skillGrid']}>
        {SKILL_CONFIGS.map(({ key, Icon, label, color }) => {
          const stats = getSkillStats(key, progress);
          return (
            <div key={key} className={styles['skillCard']} style={{ '--skill-color': color } as React.CSSProperties}>
              <div className={styles['skillCardHead']}>
                <div className={styles['skillIcon']}>
                  <Icon size={16} />
                </div>
                <div className={styles['skillMeta']}>
                  <span className={styles['skillName']}>{label}</span>
                  <span className={styles['skillDetail']}>{stats.secondary}</span>
                </div>
                <span className={styles['skillPct']}>{stats.pct}%</span>
              </div>
              <div className={styles['skillBar']}>
                <div
                  className={styles['skillBarFill']}
                  style={{ width: `${stats.pct}%`, backgroundColor: color }}
                />
              </div>
              <div className={styles['skillFooter']}>
                <span className={styles['skillCount']}>{stats.completed} / {stats.required}</span>
                <div className={styles['skillAccuracyPip']}>
                  <div
                    className={styles['skillAccuracyFill']}
                    style={{ width: `${stats.accuracy}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProgressPage() {
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
    await dispatch(requestLevelUp());
  }, [dispatch]);

  if (user === null) {
    return null;
  }

  if (isLoading && data === null) {
    return <FullPageSpinner label="Loading progress…" />;
  }

  const totalMinutes = data ? computeTotalMinutes(data.recentActivity) : 0;
  const activeDays = data ? computeActiveDays(data.recentActivity) : 0;

  return (
    <div className={styles['page']}>
      {/* ── Page header ── */}
      <header className={styles['header']}>
        <div>
          <h1 className={styles['pageTitle']}>Progress</h1>
          <p className={styles['pageSubtitle']}>Track your TOEFL journey across all skills</p>
        </div>
        {data?.progress.isReadyForTest && (
          <button
            type="button"
            className={styles['levelUpBtn']}
            onClick={() => { void handleLevelUp(); }}
            disabled={isLevelingUp}
          >
            <Trophy size={16} />
            {isLevelingUp ? 'Leveling up…' : 'Take Level Test'}
          </button>
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
          {/* ── Top stats ── */}
          <div className={styles['statsRow']}>
            <div className={styles['statCard']}>
              <div className={`${styles['statIcon']} ${styles['purple']}`}>
                <TrendingUp size={18} />
              </div>
              <div className={styles['statInfo']}>
                <span className={styles['statValue']}>{data.currentLevel}</span>
                <span className={styles['statLabel']}>Current level</span>
              </div>
            </div>

            <div className={styles['statCard']}>
              <div className={`${styles['statIcon']} ${styles['amber']}`}>
                <Flame size={18} />
              </div>
              <div className={styles['statInfo']}>
                <span className={styles['statValue']}>{data.streak}</span>
                <span className={styles['statLabel']}>Day streak</span>
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

            <div className={styles['statCard']}>
              <div className={`${styles['statIcon']} ${styles['blue']}`}>
                <Clock size={18} />
              </div>
              <div className={styles['statInfo']}>
                <span className={styles['statValue']}>{totalMinutes}</span>
                <span className={styles['statLabel']}>Minutes studied</span>
              </div>
            </div>

            <div className={styles['statCard']}>
              <div className={`${styles['statIcon']} ${styles['rose']}`}>
                <Calendar size={18} />
              </div>
              <div className={styles['statInfo']}>
                <span className={styles['statValue']}>{activeDays}</span>
                <span className={styles['statLabel']}>Active days (30d)</span>
              </div>
            </div>
          </div>

          {/* ── Level journey ── */}
          <LevelJourney
            currentLevel={data.currentLevel}
            readinessPercent={data.readinessPercent}
          />

          {/* ── Skill breakdown ── */}
          <SkillBreakdown progress={data.progress} />

          {/* ── Activity heatmap ── */}
          <ActivityHeatmap recentActivity={data.recentActivity} />

          {/* ── Readiness gate notice ── */}
          {data.progress.isReadyForTest && (
            <div className={styles['readyBanner']}>
              <Trophy size={20} />
              <div>
                <strong>You're ready for the level test!</strong>
                <p>All skill requirements for {data.currentLevel} have been met.</p>
              </div>
              <button
                type="button"
                className={styles['levelUpBtnInline']}
                onClick={() => { void handleLevelUp(); }}
                disabled={isLevelingUp}
              >
                {isLevelingUp ? 'Processing…' : 'Level Up →'}
              </button>
            </div>
          )}
        </>
      )}

      {data === null && !isLoading && error === null && (
        <div className={styles['emptyState']}>
          <BarChart2 size={48} />
          <p>No progress data yet. Start practicing to see your stats here.</p>
        </div>
      )}
    </div>
  );
}