import { useTranslation } from 'react-i18next';
import { SnakeTrack } from '../SnakeTrack/SnakeTrack';
import type { RoadmapResponse, RoadmapLevelSummary } from '@/types/roadmap/Roadmap.types';
import styles from './RoadmapSection.module.css';

interface RoadmapSectionProps {
  roadmapData: RoadmapResponse;
  readiness: number;
  onNodeClick: (lvl: RoadmapLevelSummary) => void;
}

export function RoadmapSection({ roadmapData, readiness, onNodeClick }: RoadmapSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={`${styles['section']} ${styles['roadmapSection']}`}>
      <div className={styles['roadmapTopRow']}>
        <div>
          <h2 className={styles['sectionHeading']}>{t('progress.roadmap')}</h2>
          <p className={styles['roadmapSub']}>{t('progress.roadmapHint')}</p>
        </div>
        <div className={styles['roadmapRight']}>
          <div className={styles['readinessBig']}>{readiness}%</div>
          <div className={styles['readinessLabel']}>{t('progress.totalProgress')}</div>
        </div>
      </div>

      <div className={styles['roadmapBarWrap']}>
        <div className={styles['roadmapBarTrack']}>
          <div className={styles['roadmapBarFill']} style={{ width: `${readiness}%` }} />
        </div>
        <span className={styles['roadmapBarHint']}>
          {roadmapData.coreTopicsMasteredCount}/{roadmapData.coreTopicsTotalCount} — {roadmapData.currentLevel}
        </span>
      </div>

      <SnakeTrack levels={roadmapData.levels} readiness={readiness} onNodeClick={onNodeClick} />
    </div>
  );
}