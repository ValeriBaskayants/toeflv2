import { useTranslation } from 'react-i18next';
import { TrendingUp, Clock, Target, BookOpen, PenLine, Headphones, Mic, CheckCheck, Layers, ChevronRight } from 'lucide-react';
import { useAppSelector } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import styles from './DashboardPage.module.css';

const SECTION_CARDS = [
  { icon: PenLine,    key: 'writing',    to: '/writing',    color: '#6366f1', progress: 0 },
  { icon: BookOpen,   key: 'reading',    to: '/reading',    color: '#22c55e', progress: 0 },
  { icon: Headphones, key: 'listening',  to: '/listening',  color: '#f59e0b', progress: 0 },
  { icon: Mic,        key: 'speaking',   to: '/speaking',   color: '#ec4899', progress: 0 },
  { icon: CheckCheck, key: 'grammar',    to: '/grammar',    color: '#14b8a6', progress: 0 },
  { icon: Layers,     key: 'vocabulary', to: '/vocabulary', color: '#8b5cf6', progress: 0 },
] as const;

const QUICK_STATS = [
  { icon: TrendingUp, labelKey: 'dashboard.statLevel',   value: 'A2',    colorClass: 'purple' },
  { icon: Clock,      labelKey: 'dashboard.statStreak',  value: '0',     colorClass: 'amber' },
  { icon: Target,     labelKey: 'dashboard.statGoal',    value: '0 / 7', colorClass: 'green' },
] as const;

function GreetingMessage({ name }: { name: string }) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const periodKey =
    hour < 12 ? 'dashboard.morning'
    : hour < 18 ? 'dashboard.afternoon'
    : 'dashboard.evening';

  return (
    <div className={styles['greetingBlock']}>
      <h1 className={styles['greeting']}>
        {t(periodKey)}, <span className={styles['greetingName']}>{name.split(' ')[0]}</span>
      </h1>
      <p className={styles['greetingSubtitle']}>{t('dashboard.subtitle')}</p>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useAppSelector(selectUser);

  // Guaranteed by ProtectedRoute
  if (user === null) {
    return null;
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

      {/* ── Quick stats ── */}
      <div className={styles['statsGrid']}>
        {QUICK_STATS.map(({ icon: Icon, labelKey, value, colorClass }) => (
          <div key={labelKey} className={styles['statCard']}>
            <div className={`${styles['statIcon']} ${styles[colorClass]}`}>
              <Icon size={18} />
            </div>
            <div className={styles['statInfo']}>
              <span className={styles['statValue']}>{value}</span>
              <span className={styles['statLabel']}>{t(labelKey)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Weekly progress ── */}
      <section className={styles['progressSection']}>
        <div className={styles['sectionHeader']}>
          <h2 className={styles['sectionTitle']}>{t('dashboard.weeklyGoal')}</h2>
          <span className={styles['sectionMeta']}>0 / 7 {t('dashboard.days')}</span>
        </div>
        <div className={styles['weekDots']}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className={styles['weekDot']}>
              <div className={styles['dot']} />
              <span className={styles['dotLabel']}>{day}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Practice sections ── */}
      <section>
        <div className={styles['sectionHeader']}>
          <h2 className={styles['sectionTitle']}>{t('dashboard.practiceAreas')}</h2>
        </div>
        <div className={styles['sectionGrid']}>
          {SECTION_CARDS.map(({ icon: Icon, key, color }) => (
            <div key={key} className={styles['sectionCard']}>
              <div className={styles['sectionCardTop']}>
                <div className={styles['sectionIconWrap']} style={{ '--card-color': color } as React.CSSProperties}>
                  <Icon size={20} />
                </div>
                <span className={styles['comingSoon']}>{t('dashboard.comingSoon')}</span>
              </div>
              <h3 className={styles['sectionName']}>{t(`dashboard.features.${key}`)}</h3>
              <div className={styles['sectionProgress']}>
                <div className={styles['sectionProgressTrack']}>
                  <div className={styles['sectionProgressFill']} style={{ width: '0%' }} />
                </div>
                <span className={styles['sectionProgressLabel']}>0%</span>
              </div>
              <div className={styles['sectionCardArrow']}>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}