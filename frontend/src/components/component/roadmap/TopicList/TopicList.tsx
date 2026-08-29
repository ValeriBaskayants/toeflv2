import { useTranslation } from 'react-i18next';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { RoadmapTopicNode, TopicNodeStatus } from '@/types/roadmap/Roadmap.types';
import styles from './TopicList.module.css';
import { TOPIC_STATUS_STYLE, topicPct } from '@/constants/roadmap.constants';

interface TopicMiniCardProps {
  node: RoadmapTopicNode;
  isRecommended: boolean;
  onOpen: (slug: string) => void;
}

function TopicMiniCard({ node, isRecommended, onOpen }: TopicMiniCardProps) {
  const { t } = useTranslation();
  const cfg = TOPIC_STATUS_STYLE[node.status];
  const Icon = cfg.Icon;
  const pct = topicPct(node);
  const isLocked = node.status === 'locked';

  return (
    <div
      className={`${styles['topicRow']} ${isLocked ? styles['topicRowLocked'] : ''} ${isRecommended ? styles['topicRowRec'] : ''}`}
      style={{ '--tc': cfg.color } as React.CSSProperties}
    >
      <div className={styles['topicStatusDot']} style={{ color: cfg.color, background: cfg.bg }}>
        <Icon size={12} />
      </div>

      <div className={styles['topicRowBody']}>
        <div className={styles['topicRowHead']}>
          <span className={styles['topicRowNum']}>#{node.order}</span>
          <span className={styles['topicRowTitle']}>{node.title}</span>
          {isRecommended && (
            <span className={styles['topicRecBadge']}>
              <Sparkles size={9} /> {t('common.next', { defaultValue: 'Next' })}
            </span>
          )}
          {!node.isCore && <span className={styles['topicOptBadge']}>opt</span>}
        </div>
        {!isLocked && (
          <div className={styles['topicRowBar']}>
            <div className={styles['topicRowBarFill']} style={{ width: `${pct}%`, background: cfg.color }} />
          </div>
        )}
      </div>

      {!isLocked && (
        <button
          type="button"
          className={styles['topicRowBtn']}
          style={{ '--tc': cfg.color } as React.CSSProperties}
          onClick={() => onOpen(node.slug)}
        >
          {t(`roadmap.topicStatus.${node.status}`)}
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

interface TopicListProps {
  currentLevel: string;
  topics: RoadmapTopicNode[];
  recommendedSlug: string | null;
  onOpenTopic: (slug: string) => void;
}

export function TopicList({ currentLevel, topics, recommendedSlug, onOpenTopic }: TopicListProps) {
  const { t } = useTranslation();

  if (topics.length === 0) {
    return (
      <div className={`${styles['section']} ${styles['topicSection']}`}>
        <div className={styles['noTopicsState']}>
          <Sparkles size={28} />
          <p className={styles['noTopicsTitle']}>{t('progress.noTopicsYet')}</p>
          <p className={styles['noTopicsHint']}>{t('progress.noTopicsYetHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles['section']} ${styles['topicSection']}`}>
      <div className={styles['topicSectionHead']}>
        <div>
          <h2 className={styles['sectionHeading']}>
            {currentLevel} — {t('progress.roadmap')}
          </h2>
          <p className={styles['topicSectionSub']}>{topics.length}</p>
        </div>
        <div className={styles['topicSummaryPills']}>
          {(['in_progress', 'available', 'mastered', 'needs_review', 'locked'] as TopicNodeStatus[]).map((s) => {
            const count = topics.filter((t2) => t2.status === s).length;
            if (count === 0) return null;
            const cfg = TOPIC_STATUS_STYLE[s];
            return (
              <span key={s} className={styles['topicSumPill']} style={{ color: cfg.color, background: cfg.bg }}>
                {count}
              </span>
            );
          })}
        </div>
      </div>

      <div className={styles['topicList']}>
        {topics.map((node) => (
          <TopicMiniCard key={node.slug} node={node} isRecommended={node.slug === recommendedSlug} onOpen={onOpenTopic} />
        ))}
      </div>
    </div>
  );
}