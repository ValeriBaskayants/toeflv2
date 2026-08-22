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
  Sparkles,
  TrendingUp,
  Check,
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
  { key: 'grammar',    Icon: CheckCheck, color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)', to: '/grammar' },
  { key: 'reading',   Icon: BookOpen,   color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', to: '/reading' },
  { key: 'listening', Icon: Headphones, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', to: '/listening' },
  { key: 'writing',   Icon: PenLine,    color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)', to: '/writing' },
  { key: 'vocabulary',Icon: Layers,     color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', to: '/vocabulary' },
  { key: 'quiz',      Icon: Brain,      color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', to: '/quiz' },
] as const;

function buildWeekDots(recentActivity: DailyActivity[]) {
  const activitySet = new Set(recentActivity.map((a) => a.date));
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

  return Array.from({ length: 7 }, (_, offset) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - offset));
    const date = d.toISOString().slice(0, 10);
    const isToday = offset === 6;
    return {
      date,
      label: DAY_LABELS[d.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6],
      active: activitySet.has(date),
      isToday,
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
      <div className={styles['greetingBadge']}>
        <Sparkles size={13} className={styles['greetingSparkle']} />
        <span>Ready to study?</span>
      </div>
      <h1 className={styles['greeting']}>
        {t(key)}, <span className={styles['greetingName']}>{firstName}</span> 👋
      </h1>
      <p className={styles['greetingSubtitle']}>{t('dashboard.subtitle')}</p>
    </div>
  );
}

function LevelBadge({ level, readiness }: { level: string; readiness: number }) {
  const { t } = useTranslation();
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, Math.max(0, readiness)) / 100) * circ;

  return (
    <div className={styles['levelBadgeWrap']}>
      <div className={styles['levelBadge']}>
        <svg width="68" height="68" viewBox="0 0 68 68" className={styles['levelSvg']}>
          <circle 
            cx="34" cy="34" r={radius} 
            fill="none" 
            stroke="var(--surface-2)" 
            strokeWidth="5" 
          />
          <circle
            cx="34" cy="34" r={radius}
            fill="none"
            stroke={readiness >= 100 ? '#22c55e' : 'var(--accent)'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 34 34)"
            className={styles['levelSvgProgress']}
          />
        </svg>
        <div className={styles['levelBadgeInner']}>
          <span className={styles['levelBadgeText']}>{level}</span>
        </div>
      </div>
      <div className={styles['levelBadgeInfo']}>
        <span className={styles['levelBadgeHint']}>{readiness}% {t('dashboard.ready')}</span>
        <div className={styles['levelMiniTrack']}>
          <div className={styles['levelMiniFill']} style={{ width: `${Math.min(100, readiness)}%` }} />
        </div>
      </div>
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
      {/* Background Glow Aura */}
      <div className={styles['pageAura']} aria-hidden="true" />

      {/* Header Section */}
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

      {/* Placement Banner */}
      {showBanner && statusLoaded && <PlacementBanner />}

      {/* Error State */}
      {error !== null && (
        <div className={styles['errorBanner']}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={handleRetry} className={styles['retryBtn']}>
            <RefreshCw size={14} />
            {t('common.retry')}
          </button>
        </div>
      )}

      {data !== null && (
        <div className={styles['dashboardLayout']}>
          {/* Quick Stats Grid */}
          <section className={styles['statsGrid']} aria-label="Quick Stats">
            <div className={`${styles['statCard']} ${data.streak >= 7 ? styles['streakHot'] : ''}`}>
              <div className={styles['statCardIconWrap']} style={{ '--accent-glow': '#f59e0b' } as React.CSSProperties}>
                <Flame size={20} className={styles['streakIcon']} />
              </div>
              <div className={styles['statCardContent']}>
                <div className={styles['statCardHeader']}>
                  <span className={styles['statCardValue']}>{data.streak}</span>
                  {data.streak > 0 && <span className={styles['statCardBadge']}>days</span>}
                </div>
                <span className={styles['statCardLabel']}>{t('dashboard.statStreak')}</span>
              </div>
            </div>

            <div className={styles['statCard']}>
              <div className={styles['statCardIconWrap']} style={{ '--accent-glow': '#6366f1' } as React.CSSProperties}>
                <Zap size={20} className={styles['xpIcon']} />
              </div>
              <div className={styles['statCardContent']}>
                <div className={styles['statCardHeader']}>
                  <span className={styles['statCardValue']}>{data.totalXp.toLocaleString()}</span>
                  <span className={styles['statCardBadge']}>XP</span>
                </div>
                <span className={styles['statCardLabel']}>{t('dashboard.statXp')}</span>
              </div>
            </div>

            <div className={styles['statCard']}>
              <div className={styles['statCardIconWrap']} style={{ '--accent-glow': '#10b981' } as React.CSSProperties}>
                <Target size={20} className={styles['targetIcon']} />
              </div>
              <div className={styles['statCardContent']}>
                <div className={styles['statCardHeader']}>
                  <span className={styles['statCardValue']}>{activeDays}/7</span>
                  <span className={styles['statCardBadge']}>this week</span>
                </div>
                <span className={styles['statCardLabel']}>{t('dashboard.statWeek')}</span>
              </div>
            </div>
          </section>

          {/* Next Goal & Level Up CTA */}
          <div className={styles['actionSection']}>
            <button
              type="button"
              className={styles['goalBanner']}
              onClick={() => navigate('/progress')}
            >
              <div className={styles['goalBannerLeft']}>
                <div className={styles['goalBannerIcon']}>
                  {data.testUnlocked ? <Trophy size={20} /> : <Target size={20} />}
                </div>
                <div className={styles['goalBannerContent']}>
                  <div className={styles['goalBannerHeader']}>
                    <span className={styles['goalBannerLabel']}>
                      {data.testUnlocked ? t('dashboard.testReady') : t('dashboard.nextGoal')}
                    </span>
                    <span className={styles['goalTag']}>
                      <TrendingUp size={11} /> Milestone
                    </span>
                  </div>
                  <p className={styles['goalBannerText']}>{data.nextMilestone}</p>
                </div>
              </div>
              <div className={styles['goalBannerAction']}>
                <span className={styles['goalBannerActionText']}>View Progress</span>
                <ArrowRight size={16} className={styles['goalBannerArrow']} />
              </div>
            </button>

            {data.testUnlocked && (
              <button
                type="button"
                className={styles['levelUpCta']}
                onClick={handleLevelUp}
                disabled={isLevelingUp}
              >
                <Trophy size={18} />
                <span>{isLevelingUp ? t('dashboard.levelingUp') : t('dashboard.takeTest')}</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Weekly Activity Section */}
          <section className={styles['weekSection']}>
            <div className={styles['weekHeader']}>
              <div className={styles['weekHeaderTitleWrap']}>
                <h2 className={styles['sectionTitle']}>{t('dashboard.weeklyGoal')}</h2>
                <p className={styles['sectionSubtitle']}>Consistency is key to mastering TOEFL</p>
              </div>
              <span className={`${styles['weekMeta']} ${activeDays === 7 ? styles['weekMetaPerfect'] : ''}`}>
                {activeDays === 7 ? (
                  <>
                    <Sparkles size={13} />
                    {t('dashboard.perfectWeek')}
                  </>
                ) : (
                  `${activeDays} / 7 ${t('dashboard.days')}`
                )}
              </span>
            </div>

            <div className={styles['weekTracker']}>
              <div className={styles['weekDotsGrid']}>
                {weekDots.map(({ date, label, active, isToday }) => (
                  <div
                    key={date}
                    className={`${styles['weekDotCard']} ${active ? styles['weekDotCardActive'] : ''} ${isToday ? styles['weekDotCardToday'] : ''}`}
                  >
                    <div className={styles['dotIndicator']}>
                      {active ? <Check size={14} strokeWidth={3} /> : null}
                    </div>
                    <span className={styles['dotLabel']}>{label}</span>
                    {isToday && <span className={styles['todayTag']}>Today</span>}
                  </div>
                ))}
              </div>
              <div className={styles['weekProgressBar']}>
                <div 
                  className={styles['weekProgressFill']} 
                  style={{ width: `${(activeDays / 7) * 100}%` }} 
                />
              </div>
            </div>
          </section>

          {/* Weak Skill Focus Nudge */}
          {weakestSkill !== null && (data.skillBreakdown[weakestSkill]?.sms ?? 100) < 80 && (
            <div className={styles['focusNudge']}>
              <div className={styles['focusNudgeGlow']} />
              <div className={styles['focusNudgeLeft']}>
                <span className={styles['focusNudgeEmoji']}>💡</span>
                <div className={styles['focusNudgeText']}>
                  <strong>{t('dashboard.focusOn')} {t(`skills.${weakestSkill}`)}</strong>
                  <p>{t('dashboard.focusHint')}</p>
                </div>
              </div>
              <button
                type="button"
                className={styles['focusNudgeBtn']}
                onClick={() => navigate(`/${weakestSkill}`)}
              >
                <span>{t('dashboard.practice')}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Practice Areas (Grid) */}
          <section className={styles['practiceSection']}>
            <div className={styles['practiceHeader']}>
              <div>
                <h2 className={styles['sectionTitle']}>{t('dashboard.practiceAreas')}</h2>
                <p className={styles['sectionSubtitle']}>Select a skill section to sharpen your score</p>
              </div>
              <button
                type="button"
                className={styles['viewAllBtn']}
                onClick={() => navigate('/progress')}
              >
                <span>{t('dashboard.viewProgress')}</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className={styles['sectionGrid']}>
              {SECTION_CARDS.map(({ key, Icon, color, gradient, to }) => {
                const breakdown = data.skillBreakdown?.[key];
                const sms = breakdown?.sms ?? 0;
                const isWeak = data.weakestSkill === key;

                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles['sectionCard']} ${isWeak ? styles['sectionCardWeak'] : ''}`}
                    style={{ 
                      '--card-color': color,
                      '--card-gradient': gradient,
                    } as React.CSSProperties}
                    onClick={() => navigate(to)}
                  >
                    <div className={styles['sectionCardHeader']}>
                      <div className={styles['sectionIconWrap']}>
                        <Icon size={20} />
                      </div>
                      {isWeak ? (
                        <span className={styles['weakTag']}>{t('dashboard.focusTag')}</span>
                      ) : (
                        <div className={styles['cardArrowWrap']}>
                          <ArrowRight size={14} className={styles['cardArrow']} />
                        </div>
                      )}
                    </div>

                    <div className={styles['sectionCardBody']}>
                      <h3 className={styles['sectionName']}>{t(`skills.${key}`)}</h3>
                      <div className={styles['sectionBarWrap']}>
                        <div className={styles['sectionBarMeta']}>
                          <span className={styles['sectionBarScoreLabel']}>Proficiency</span>
                          <span className={styles['sectionBarLabel']}>{sms}%</span>
                        </div>
                        <div className={styles['sectionBarTrack']}>
                          <div
                            className={styles['sectionBarFill']}
                            style={{ width: `${Math.min(100, sms)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}