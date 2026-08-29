import { useTranslation } from 'react-i18next';
import type { DailyActivity } from '@/types/progress/Progress.types';
import styles from './ActivityHeatmap.module.css';

function buildCells(act: DailyActivity[]) {
  const map = new Map(act.map((a) => [a.date, a.xpEarned]));
  return Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    const date = d.toISOString().slice(0, 10);
    const xp = map.get(date) ?? 0;
    const intensity: 0 | 1 | 2 | 3 | 4 = xp === 0 ? 0 : xp < 30 ? 1 : xp < 80 ? 2 : xp < 150 ? 3 : 4;
    return { date, xp, intensity };
  });
}

interface ActivityHeatmapProps {
  recentActivity: DailyActivity[];
}

export function ActivityHeatmap({ recentActivity }: ActivityHeatmapProps) {
  const { t } = useTranslation();
  const cells = buildCells(recentActivity);
  const weeks = Array.from({ length: 5 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <div className={`${styles['section']} ${styles['heatSection']}`}>
      <div className={styles['heatHead']}>
        <h2 className={styles['sectionHeading']}>{t('progress.activity')}</h2>
      </div>
      <div className={styles['heatGrid']}>
        <div className={styles['heatDays']}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className={styles['heatDay']}>{d}</span>
          ))}
        </div>
        <div className={styles['heatWeeks']}>
          {weeks.map((week, wi) => (
            <div key={wi} className={styles['heatWeek']}>
              {week.map((c) => (
                <div
                  key={c.date}
                  className={`${styles['heatCell']} ${styles[`hi${c.intensity}`]}`}
                  title={c.xp > 0 ? `${c.date}: ${c.xp} XP` : c.date}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles['heatLeg']}>
        <span className={styles['heatLegLbl']}>{t('progress.less')}</span>
        {([0, 1, 2, 3, 4] as const).map((i) => (
          <div key={i} className={`${styles['heatLegCell']} ${styles[`hi${i}`]}`} />
        ))}
        <span className={styles['heatLegLbl']}>{t('progress.more')}</span>
      </div>
    </div>
  );
}