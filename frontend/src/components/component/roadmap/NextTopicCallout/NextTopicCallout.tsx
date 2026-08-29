import { useTranslation } from 'react-i18next';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { RoadmapTopicNode } from '@/types/roadmap/Roadmap.types';
import styles from './NextTopicCallout.module.css';

interface NextTopicCalloutProps {
  topic: RoadmapTopicNode;
  onOpen: () => void;
}

export function NextTopicCallout({ topic, onOpen }: NextTopicCalloutProps) {
  const { t } = useTranslation();

  return (
    <div className={styles['nextCallout']}>
      <div className={styles['nextCalloutLeft']}>
        <span className={styles['nextCalloutEye']}>
          <Sparkles size={12} />
        </span>
        <span className={styles['nextCalloutTitle']}>{topic.title}</span>
        <span className={styles['nextCalloutSummary']}>
          {topic.summary.slice(0, 90)}
          {topic.summary.length > 90 ? '…' : ''}
        </span>
      </div>
      <button type="button" className={styles['nextCalloutBtn']} onClick={onOpen}>
        {t(`roadmap.topicStatus.${topic.status}`)}
        <ChevronRight size={15} />
      </button>
    </div>
  );
}