import { useEffect, useCallback } from 'react';
import {
  Flame,
  Zap,
  Target,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  BookOpen,
  PenLine,
  Headphones,
  CheckCheck,
  Layers,
  Brain,
  Trophy,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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

const SECTION_CARDS = [
  { key: 'grammar',    Icon: CheckCheck, color: '#14b8a6', to: '/grammar' },
  { key: 'reading',   Icon: BookOpen,   color: '#22c55e', to: '/reading' },
  { key: 'listening', Icon: Headphones, color: '#f59e0b', to: '/listening' },
  { key: 'writing',   Icon: PenLine,    color: '#ec4899', to: '/writing' },
  { key: 'vocabulary',Icon: Layers,     color: '#8b5cf6', to: '/vocabulary' },
  { key: 'quiz',      Icon: Brain,      color: '#6366f1', to: '/quiz' },
] as const;

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

function GreetingMessage({ name }: { name: string }) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const key = hour < 12 ? 'dashboard.morning'
    : hour < 18 ? 'dashboard.afternoon'
    : 'dashboard.evening';
  const firstName = name.split(' ')[0] ?? name;

  return (
    <div className={styles['greetingBlock']}>
      <h1 className={styles['greeting']}>
        {t(key)}, <span className={styles['greetingName']}>{firstName}</span>
      </h1>
      <p className={styles['greetingSubtitle']}>{t('dashboard.subtitle')}</p>
    </div>
  );
}

function LevelBadge({ level, readiness }: { level: string; readiness: number }) {
  const { t } = useTranslation();
  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (readiness / 100) * circ;

  return (
    <div className={styles['levelBadge']}>
      <svg width="58" height="58" viewBox="0 0 58 58">
        <circle cx="29" cy="29" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="5" />
        <circle
          cx="29" cy="29" r={radius}
          fill="none"
          stroke={readiness >= 100 ? '#22c55e' : 'var(--accent)'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 29 29)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div className={styles['levelBadgeInner']}>
        <span className={styles['levelBadgeText']}>{level}</span>
      </div>
      <span className={styles['levelBadgeHint']}>{readiness}% {t('dashboard.ready')}</span>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

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

  const handleRetry = useCallback(() => { void dispatch(fetchDashboard()); }, [dispatch]);
  const handleLevelUp = useCallback(() => { void dispatch(requestLevelUp()); }, [dispatch]);

  if (user === null) return null;
  if (isLoading && data === null) return <FullPageSpinner label={t('auth.sessionRestored')} />;

  const weekDots = data !== null ? buildWeekDots(data.recentActivity) : [];
  const activeDays = weekDots.filter((d) => d.active).length;

  const weakestSkill = data?.skillBreakdown
    ? Object.entries(data.skillBreakdown).reduce(
        (a, [k, v]) => (v.sms < a[1] ? ([k, v.sms] as [string, number]) : a),
        ['grammar', 101] as [string, number],
      )[0]
    : null;

  return (
    <div className={styles['page']}>
      {/* Header */}
      <header className={styles['header']}>
        <GreetingMessage name={user.name} />
        <div className={styles['headerRight']}>
          {user.role === 'ADMIN' && (
            <span className={styles['adminBadge']}>{t('dashboard.admin')}</span>
          )}
          {data !== null && (
            <LevelBadge level={data.currentLevel} readiness={data.readinessPercent} />
          )}
        </div>
      </header>

      {showBanner && statusLoaded && <PlacementBanner />}

      {error !== null && (
        <div className={styles['errorBanner']}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" onClick={handleRetry} className={styles['retryBtn']}>
            <RefreshCw size={14} />
            {t('common.retry')}
          </button>
        </div>
      )}

      {data !== null && (
        <>
          {/* Quick Stats Row */}
          <div className={styles['statsRow']}>
            <div className={`${styles['statPill']} ${data.streak >= 7 ? styles['streakHot'] : ''}`}>
              <Flame size={16} className={styles['statPillIcon']} />
              <span className={styles['statPillValue']}>{data.streak}</span>
              <span className={styles['statPillLabel']}>{t('dashboard.statStreak')}</span>
            </div>
            <div className={styles['statPill']}>
              <Zap size={16} className={styles['statPillIcon']} />
              <span className={styles['statPillValue']}>{data.totalXp.toLocaleString()}</span>
              <span className={styles['statPillLabel']}>{t('dashboard.statXp')}</span>
            </div>
            <div className={styles['statPill']}>
              <Target size={16} className={styles['statPillIcon']} />
              <span className={styles['statPillValue']}>{activeDays}/7</span>
              <span className={styles['statPillLabel']}>{t('dashboard.statWeek')}</span>
            </div>
          </div>

          {/* Next Goal Banner */}
          <button
            type="button"
            className={styles['goalBanner']}
            onClick={() => navigate('/progress')}
          >
            <div className={styles['goalBannerIcon']}>
              {data.testUnlocked ? <Trophy size={16} /> : <Target size={16} />}
            </div>
            <div className={styles['goalBannerContent']}>
              <span className={styles['goalBannerLabel']}>
                {data.testUnlocked ? t('dashboard.testReady') : t('dashboard.nextGoal')}
              </span>
              <p className={styles['goalBannerText']}>{data.nextMilestone}</p>
            </div>
            <ArrowRight size={15} className={styles['goalBannerArrow']} />
          </button>

          {/* Test unlock CTA */}
          {data.testUnlocked && (
            <button
              type="button"
              className={styles['levelUpCta']}
              onClick={handleLevelUp}
              disabled={isLevelingUp}
            >
              <Trophy size={16} />
              {isLevelingUp ? t('dashboard.levelingUp') : t('dashboard.takeTest')}
            </button>
          )}

          {/* Weekly Activity */}
          <section className={styles['weekSection']}>
            <div className={styles['weekHeader']}>
              <h2 className={styles['sectionTitle']}>{t('dashboard.weeklyGoal')}</h2>
              <span className={styles['weekMeta']}>
                {activeDays === 7 ? t('dashboard.perfectWeek') : `${activeDays} / 7 ${t('dashboard.days')}`}
              </span>
            </div>
            <div className={styles['weekDots']}>
              {weekDots.map(({ date, label, active }) => (
                <div key={date} className={styles['weekDot']}>
                  <div className={`${styles['dot']} ${active ? styles['dotActive'] : ''}`} />
                  <span className={styles['dotLabel']}>{label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Weak skill nudge */}
          {weakestSkill !== null && (data.skillBreakdown[weakestSkill]?.sms ?? 100) < 80 && (
            <div className={styles['focusNudge']}>
              <span className={styles['focusNudgeEmoji']}>💡</span>
              <div className={styles['focusNudgeText']}>
                <strong>{t('dashboard.focusOn')} {t(`skills.${weakestSkill}`)}</strong>
                <span> — {t('dashboard.focusHint')}</span>
              </div>
              <button
                type="button"
                className={styles['focusNudgeBtn']}
                onClick={() => navigate(`/${weakestSkill}`)}
              >
                {t('dashboard.practice')} <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Practice Areas */}
          <section>
            <div className={styles['weekHeader']}>
              <h2 className={styles['sectionTitle']}>{t('dashboard.practiceAreas')}</h2>
              <button
                type="button"
                className={styles['viewAllBtn']}
                onClick={() => navigate('/progress')}
              >
                {t('dashboard.viewProgress')} →
              </button>
            </div>
            <div className={styles['sectionGrid']}>
              {SECTION_CARDS.map(({ key, Icon, color, to }) => {
                const breakdown = data.skillBreakdown?.[key];
                const sms = breakdown?.sms ?? 0;
                const isWeak = data.weakestSkill === key;

                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles['sectionCard']} ${isWeak ? styles['sectionCardWeak'] : ''}`}
                    style={{ '--card-color': color } as React.CSSProperties}
                    onClick={() => navigate(to)}
                  >
                    <div className={styles['sectionCardTop']}>
                      <div className={styles['sectionIconWrap']}>
                        <Icon size={18} />
                      </div>
                      {isWeak && (
                        <span className={styles['weakTag']}>{t('dashboard.focusTag')}</span>
                      )}
                    </div>
                    <h3 className={styles['sectionName']}>{t(`skills.${key}`)}</h3>
                    <div className={styles['sectionBar']}>
                      <div className={styles['sectionBarTrack']}>
                        <div
                          className={styles['sectionBarFill']}
                          style={{ width: `${sms}%` }}
                        />
                      </div>
                      <span className={styles['sectionBarLabel']}>{sms}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}