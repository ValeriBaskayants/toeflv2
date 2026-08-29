import { useTranslation } from 'react-i18next';
import { TrendingUp, Flame, Zap, Clock, Calendar } from 'lucide-react';
import type { DashboardData } from '@/types/progress/Progress.types';
import styles from './ProgressStatsStrip.module.css';

interface ProgressStatsStripProps {
  dashData: DashboardData;
}

export function ProgressStatsStrip({ dashData }: ProgressStatsStripProps) {
  const { t } = useTranslation();

  const totalMin = dashData.recentActivity.reduce((s, a) => s + a.minutesSpent, 0);
  const active30 = (() => {
    const cut = new Date();
    cut.setDate(cut.getDate() - 30);
    const cs = cut.toISOString().slice(0, 10);
    return dashData.recentActivity.filter((a) => a.date >= cs && a.xpEarned > 0).length;
  })();

  const items = [
    { Icon: TrendingUp, val: dashData.currentLevel, lbl: t('dashboard.statLevel'), cls: 'pilPurple' },
    { Icon: Flame, val: String(dashData.streak), lbl: t('dashboard.statStreak'), cls: 'pilAmber' },
    { Icon: Zap, val: dashData.totalXp.toLocaleString(), lbl: t('dashboard.statXp'), cls: 'pilGreen' },
    { Icon: Clock, val: String(totalMin), lbl: t('progress.minutes'), cls: 'pilBlue' },
    { Icon: Calendar, val: String(active30), lbl: t('progress.activeDays'), cls: 'pilRose' },
  ] as const;

  return (
    <div className={styles['statsStrip']}>
      {items.map(({ Icon, val, lbl, cls }) => (
        <div key={lbl} className={styles['statPill']}>
          <div className={`${styles['statPillIco']} ${styles[cls]}`}>
            <Icon size={14} />
          </div>
          <div>
            <div className={styles['statPillVal']}>{val}</div>
            <div className={styles['statPillLbl']}>{lbl}</div>
          </div>
        </div>
      ))}
    </div>
  );
}