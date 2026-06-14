import { useEffect, useCallback } from 'react';
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
  Target,
  ArrowRight,
  Brain,
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
import { fetchPlacementStatus } from '@/store/Slices/PlacementSlice';
import type { DailyActivity } from '@/types/progress/Progress.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { PlacementBanner } from '@/components/component/PlacementBanner/PlacementBanner';
import styles from './DashboardPage.module.css';

const SKILL_CONFIGS = [
  { key: 'grammar', Icon: CheckCheck, label: 'Grammar', color: '#14b8a6' },
  { key: 'reading', Icon: BookOpen, label: 'Reading', color: '#22c55e' },
  { key: 'listening', Icon: Headphones, label: 'Listening', color: '#f59e0b' },
  { key: 'vocabulary', Icon: Layers, label: 'Vocabulary', color: '#8b5cf6' },
  { key: 'writing', Icon: PenLine, label: 'Writing', color: '#ec4899' },
  { key: 'quiz', Icon: Brain, label: 'Quiz', color: '#6366f1' },
] as const;

type SkillKey = (typeof SKILL_CONFIGS)[number]['key'];

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

function getStreakMessage(streak: number): string {
  if (streak === 0) {
    return 'Start your streak today!';
  }
  if (streak === 1) {
    return 'Great start — come back tomorrow!';
  }
  if (streak < 7) {
    return `${streak} days strong. Keep it up!`;
  }
  if (streak < 30) {
    return `${streak} days 🔥 You're on fire!`;
  }
  return `${streak} days — Legendary!`;
}

function getSmsColor(_sms: number, baseColor: string): string {
  return baseColor;
}

function getSkillDetailLabel(
  key: SkillKey,
  breakdown: { completed: number; required: number; accuracy: number } | undefined,
): string {
  if (breakdown === undefined) {
    return '—';
  }
  if (key === 'vocabulary') {
    return `${breakdown.completed} / ${breakdown.required} words`;
  }
  return `${breakdown.completed}/${breakdown.required} done · ${Math.round(breakdown.accuracy)}% accuracy`;
}

function GreetingMessage({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = name.split(' ')[0] ?? name;

  return (
    <div className={styles['greetingBlock']}>
      <h1 className={styles['greeting']}>
        {greeting}, <span className={styles['greetingName']}>{firstName}</span>
      </h1>
      <p className={styles['greetingSubtitle']}>Ready to level up your English today?</p>
    </div>
  );
}

function ReadinessRing({ percent }: { percent: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const isReady = percent >= 100;

  return (
    <div className={styles['ringWrapper']}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={isReady ? '#22c55e' : 'var(--accent)'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className={styles['ringProgress']}
        />
      </svg>
      <div className={styles['ringLabel']}>
        <span className={styles['ringPercent']}>{percent}%</span>
        <span className={styles['ringCaption']}>ready</span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const dispatch = useAppDispatch();

  const user = useAppSelector(selectUser);
  const data = useAppSelector(selectProgressData);
  const isLoading = useAppSelector(selectProgressIsLoading);
  const error = useAppSelector(selectProgressError);
  const isLevelingUp = useAppSelector(selectIsLevelingUp);

  const { showBanner, statusLoaded } = useAppSelector((state) => state.placement);

  useEffect(() => {
    if (data === null && !isLoading && error === null) {
      void dispatch(fetchDashboard());
    }

    if (!statusLoaded) {
      void dispatch(fetchPlacementStatus());
    }
  }, [data, isLoading, error, statusLoaded, dispatch]);

  const handleRetry = useCallback(() => {
    void dispatch(fetchDashboard());
  }, [dispatch]);

  const handleLevelUp = useCallback(() => {
    void dispatch(requestLevelUp());
  }, [dispatch]);

  if (user === null) {
    return null;
  }

  if (isLoading && data === null) {
    return <FullPageSpinner label="Loading your progress…" />;
  }

  const weekDots = data !== null ? buildWeekDots(data.recentActivity) : [];
  const activeDaysThisWeek = weekDots.filter((d) => d.active).length;

  return (
    <div className={styles['page']}>
      {/* ── Header ── */}
      <header className={styles['header']}>
        <GreetingMessage name={user.name} />
        {user.role === 'ADMIN' && <span className={styles['adminBadge']}>Admin</span>}
      </header>

      {showBanner && statusLoaded && <PlacementBanner />}

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
          <div className={styles['statsGrid']}>
            <div className={styles['statCard']}>
              <div className={`${styles['statIcon']} ${styles['purple']}`}>
                <TrendingUp size={18} />
              </div>
              <div className={styles['statInfo']}>
                <span className={styles['statValue']}>{data.currentLevel}</span>
                <span className={styles['statLabel']}>Current Level</span>
              </div>
            </div>

            <div className={`${styles['statCard']} ${data.streak >= 7 ? styles['streakHot'] : ''}`}>
              <div className={`${styles['statIcon']} ${styles['amber']}`}>
                <Flame size={18} />
              </div>
              <div className={styles['statInfo']}>
                <span className={styles['statValue']}>{data.streak}</span>
                <span className={styles['statLabel']}>
                  {data.streak >= 7 ? '🔥 Day streak' : 'Day streak'}
                </span>
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

          <div className={styles['nextGoalCard']}>
            <div className={styles['nextGoalIcon']}>
              <Target size={17} />
            </div>
            <div className={styles['nextGoalContent']}>
              <span className={styles['nextGoalLabel']}>Next Goal</span>
              <p className={styles['nextGoalText']}>{data.nextMilestone}</p>
            </div>
            <ArrowRight size={15} className={styles['nextGoalArrow']} />
          </div>

          <section className={styles['readinessSection']}>
            <div className={styles['readinessLeft']}>
              <h2 className={styles['sectionTitle']}>Level Readiness</h2>
              <p className={styles['readinessHint']}>
                {data.testUnlocked
                  ? 'All skills unlocked — take the test!'
                  : `Focus on ${data.weakestSkill} to progress faster.`}
              </p>
              {data.testUnlocked && (
                <button
                  type="button"
                  className={styles['levelUpBtn']}
                  onClick={handleLevelUp}
                  disabled={isLevelingUp}
                >
                  <Trophy size={15} />
                  {isLevelingUp ? 'Leveling up…' : 'Take the Level Test'}
                </button>
              )}
            </div>
            <ReadinessRing percent={data.readinessPercent} />
          </section>

          <section className={styles['activitySection']}>
            <div className={styles['sectionHeader']}>
              <h2 className={styles['sectionTitle']}>This Week</h2>
              <span className={styles['sectionMeta']}>
                {activeDaysThisWeek === 7 ? '🏆 Perfect week!' : `${activeDaysThisWeek} / 7 days`}
              </span>
            </div>
            <div className={styles['streakMessage']}>{getStreakMessage(data.streak)}</div>
            <div className={styles['weekDots']}>
              {weekDots.map(({ date, label, active }) => (
                <div key={date} className={styles['weekDot']}>
                  <div className={`${styles['dot']} ${active ? styles['dotActive'] : ''}`} />
                  <span className={styles['dotLabel']}>{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className={styles['sectionHeader']}>
              <h2 className={styles['sectionTitle']}>Skill Mastery</h2>
              <span className={styles['sectionMeta']}>SMS = mastery score 0–100</span>
            </div>
            <div className={styles['skillGrid']}>
              {SKILL_CONFIGS.map(({ key, Icon, label, color }) => {
                const breakdown = data.skillBreakdown?.[key];
                const sms = breakdown?.sms ?? 0;
                const isWeakest = data.weakestSkill === key;
                const hasAccuracyGap = (breakdown?.accuracyGap ?? 0) > 0;
                const detailLabel = getSkillDetailLabel(
                  key,
                  breakdown as
                    | { completed: number; required: number; accuracy: number }
                    | undefined,
                );

                return (
                  <div
                    key={key}
                    className={`${styles['skillCard']} ${isWeakest ? styles['skillCardWeak'] : ''}`}
                    style={{ '--card-color': color } as React.CSSProperties}
                  >
                    <div className={styles['skillCardTop']}>
                      <div className={styles['skillIconWrap']}>
                        <Icon size={17} />
                      </div>
                      {isWeakest && <span className={styles['weakBadge']}>Focus here</span>}
                    </div>

                    <h3 className={styles['skillName']}>{label}</h3>
                    <div className={styles['smsRow']}>
                      <span className={styles['smsScore']}>{sms}</span>
                      <span className={styles['smsUnit']}>/100</span>
                    </div>

                    <div className={styles['skillTrack']}>
                      <div
                        className={styles['skillFill']}
                        style={{
                          width: `${sms}%`,
                          background: getSmsColor(sms, color),
                        }}
                      />
                    </div>

                    <p className={styles['skillDetail']}>{detailLabel}</p>

                    {hasAccuracyGap && (
                      <p className={styles['skillGap']}>
                        ↑ {Math.round(breakdown?.accuracyGap ?? 0)}% accuracy needed
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className={styles['comingSoonCard']}>
            <Mic size={16} />
            <span>Speaking practice — coming soon</span>
          </div>
        </>
      )}
    </div>
  );
}
