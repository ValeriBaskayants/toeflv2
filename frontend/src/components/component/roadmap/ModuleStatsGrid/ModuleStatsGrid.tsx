import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Mic, Shuffle, ChevronRight, type LucideIcon } from 'lucide-react';
import type { DashboardData } from '@/types/progress/Progress.types';
import styles from './ModuleStatsGrid.module.css';

interface ModuleStatCardProps {
  Icon: LucideIcon;
  color: string;
  label: string;
  completedCount: number;
  avgScore: number;
  ctaLabel: string;
  onClick: () => void;
}

function ModuleStatCard({ Icon, color, label, completedCount, avgScore, ctaLabel, onClick }: ModuleStatCardProps) {
  const { t } = useTranslation();
  return (
    <div className={styles['moduleCard']}>
      <div className={styles['moduleCardIco']} style={{ color, background: `${color}18` }}>
        <Icon size={18} />
      </div>
      <div className={styles['moduleCardBody']}>
        <span className={styles['moduleCardLabel']}>{label}</span>
        <span className={styles['moduleCardStat']}>
          {completedCount} {t('progress.completedSessions')}
          {completedCount > 0 && <span className={styles['moduleCardAvg']}>{avgScore}%</span>}
        </span>
      </div>
      <button type="button" className={styles['moduleCardBtn']} onClick={onClick}>
        {ctaLabel}
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

interface ModuleStatsGridProps {
  moduleStats: DashboardData['moduleStats'];
}

export function ModuleStatsGrid({ moduleStats }: ModuleStatsGridProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className={`${styles['section']} ${styles['moduleSection']}`}>
      <h2 className={styles['sectionHeading']}>{t('progress.moduleStatsTitle')}</h2>
      <p className={styles['moduleSectionSub']}>{t('progress.moduleStatsSubtitle')}</p>
      <div className={styles['moduleGrid']}>
        <ModuleStatCard
          Icon={Shuffle}
          color="#0d9488"
          label={t('skills.scramble')}
          completedCount={moduleStats.scramble.completedCount}
          avgScore={moduleStats.scramble.avgScore}
          ctaLabel={t('dashboard.practice')}
          onClick={() => navigate('/writing/scramble')}
        />
        <ModuleStatCard
          Icon={Mic}
          color="#ec4899"
          label={t('skills.speaking')}
          completedCount={moduleStats.speaking.completedCount}
          avgScore={moduleStats.speaking.avgScore}
          ctaLabel={t('dashboard.practice')}
          onClick={() => navigate('/speaking/listen-and-repeat')}
        />
      </div>
    </div>
  );
}