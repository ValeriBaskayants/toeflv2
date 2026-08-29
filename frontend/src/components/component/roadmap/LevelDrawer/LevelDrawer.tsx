import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, X, Lock, CheckCircle2, MapPin, Sparkles } from 'lucide-react';
import type { RoadmapLevelSummary, RoadmapTopicNode, TopicNodeStatus } from '@/types/roadmap/Roadmap.types';
import styles from './LevelDrawer.module.css';
import { LEVEL_COLOR } from '@/constants/level';
import { TOPIC_STATUS_STYLE, topicPct } from '@/constants/roadmap.constants';

interface DrawerTopicRowProps {
  node: RoadmapTopicNode;
  isRecommended: boolean;
  onOpen: (slug: string) => void;
}

function DrawerTopicRow({ node, isRecommended, onOpen }: DrawerTopicRowProps) {
  const { t } = useTranslation();
  const cfg = TOPIC_STATUS_STYLE[node.status];
  const Icon = cfg.Icon;
  const pct = topicPct(node);
  const p = node.progress;
  const isLocked = node.status === 'locked';

  const skillDots = [
    { label: 'G', val: p.grammar.completed, req: p.grammar.required, color: '#14b8a6' },
    { label: 'Q', val: p.quiz.completed, req: p.quiz.required, color: '#6366f1' },
    { label: 'R', val: p.reading.completed, req: p.reading.required, color: '#22c55e' },
    { label: 'L', val: p.listening.completed, req: p.listening.required, color: '#f59e0b' },
  ];

  return (
    <div
      className={`${styles['dTopicRow']} ${isLocked ? styles['dTopicRowLocked'] : ''} ${isRecommended ? styles['dTopicRowRec'] : ''}`}
      style={{ '--tc': cfg.color } as React.CSSProperties}
    >
      <div className={styles['dTopicAccent']} style={{ background: cfg.color }} />
      <div className={styles['dTopicIcon']} style={{ color: cfg.color, background: cfg.bg }}>
        <Icon size={13} />
      </div>

      <div className={styles['dTopicContent']}>
        <div className={styles['dTopicTitleRow']}>
          <span className={styles['dTopicNum']}>#{node.order}</span>
          <span className={styles['dTopicTitle']}>{node.title}</span>
          {isRecommended && (
            <span className={styles['dTopicRecBadge']}>
              <Sparkles size={9} />
            </span>
          )}
          {!node.isCore && <span className={styles['dTopicOpt']}>opt</span>}
        </div>

        {!isLocked && (
          <div className={styles['dTopicSkills']}>
            {skillDots.map((d) => (
              <span
                key={d.label}
                className={styles['dTopicSkillDot']}
                style={{
                  background: d.val >= d.req ? d.color : 'var(--surface-2)',
                  border: `1px solid ${d.color}`,
                  opacity: d.val >= d.req ? 1 : 0.5,
                }}
                title={`${d.label}: ${d.val}/${d.req}`}
              >
                {d.label}
              </span>
            ))}
            <div className={styles['dTopicBarMini']}>
              <div className={styles['dTopicBarFill']} style={{ width: `${pct}%`, background: cfg.color }} />
            </div>
          </div>
        )}

        {isLocked && node.missingPrerequisites.length > 0 && (
          <div className={styles['dTopicLockMsg']}>
            <Lock size={10} />
            {node.missingPrerequisites.slice(0, 2).join(', ')}
            {node.missingPrerequisites.length > 2 && ` +${node.missingPrerequisites.length - 2}`}
          </div>
        )}
      </div>

      {!isLocked && (
        <button
          type="button"
          className={styles['dTopicBtn']}
          style={{ '--tc': cfg.color } as React.CSSProperties}
          onClick={() => onOpen(node.slug)}
        >
          {t(`roadmap.topicStatus.${node.status}`)}
        </button>
      )}
    </div>
  );
}

interface LevelDrawerProps {
  lvl: RoadmapLevelSummary;
  topics: RoadmapTopicNode[];
  recommendedSlug: string | null;
  readiness: number;
  coreCount: number;
  coreMastered: number;
  onClose: () => void;
  onLevelUp: () => void;
  isLevelingUp: boolean;
  isReadyForTest: boolean;
  onOpenTopic: (slug: string) => void;
}

export function LevelDrawer({
  lvl, topics, recommendedSlug, readiness, coreCount, coreMastered,
  onClose, onLevelUp, isLevelingUp, isReadyForTest, onOpenTopic,
}: LevelDrawerProps) {
  const { t } = useTranslation();
  const color = LEVEL_COLOR[lvl.displayName] ?? '#6366f1';
  const isCurrent = lvl.status === 'current';
  const R = 27;
  const circ = 2 * Math.PI * R;
  const displayReadiness = lvl.status === 'completed' ? 100 : lvl.status === 'current' ? readiness : 0;
  const off = circ * (1 - displayReadiness / 100);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const statusChipCls =
    lvl.status === 'completed' ? styles['chipOk'] : lvl.status === 'current' ? styles['chipCur'] : styles['chipLock'];

  return (
    <div
      className={styles['drawerOverlay']}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles['drawer']}>
        <div className={styles['drawerBand']} style={{ background: color }} />

        <div className={styles['drawerHead']}>
          <div className={styles['drawerCircleWrap']}>
            <svg viewBox="0 0 64 64" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="3.5" style={{ opacity: 0.15 }} />
              {lvl.status !== 'locked' && (
                <circle
                  cx="32" cy="32" r={R} fill="none" stroke={color}
                  strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={off}
                  transform="rotate(-90 32 32)"
                  className={styles['drawerCircleAnim']}
                />
              )}
            </svg>
            <div className={styles['drawerCircleNum']} style={{ color }}>
              {displayReadiness}%
            </div>
          </div>

          <div className={styles['drawerMeta']}>
            <div className={styles['drawerLvlName']} style={{ color }}>
              {t('roadmap.levelPrefix', { defaultValue: 'Level' })} {lvl.displayName}
            </div>
            <div className={`${styles['drawerChip']} ${statusChipCls}`}>
              {lvl.status === 'completed' && <CheckCircle2 size={11} />}
              {lvl.status === 'current' && <MapPin size={11} />}
              {lvl.status === 'locked' && <Lock size={11} />}
              {t(`roadmap.status.${lvl.status}`)}
            </div>
            {isCurrent && (
              <div className={styles['drawerTopicStat']}>
                {coreMastered}/{coreCount} {t('roadmap.coreMastered', { defaultValue: 'core topics mastered' })}
              </div>
            )}
          </div>

          <button type="button" className={styles['drawerClose']} onClick={onClose} aria-label={t('common.close')}>
            <X size={16} />
          </button>
        </div>

        <div className={styles['drawerBar']}>
          <div className={styles['drawerBarFill']} style={{ width: `${displayReadiness}%`, background: color }} />
        </div>

        <div className={styles['drawerBody']}>
          {isReadyForTest && isCurrent && (
            <button type="button" className={styles['drawerTestBtn']} onClick={onLevelUp} disabled={isLevelingUp}>
              <Trophy size={15} />
              {isLevelingUp ? t('progress.levelingUp', { defaultValue: 'Processing…' }) : t('progress.takeLevelTest')}
            </button>
          )}

          {isCurrent && topics.length > 0 && (
            <div className={styles['drawerTopicSection']}>
              <div className={styles['drawerSectionTitle']}>
                {t('progress.roadmap')} — {topics.length}
              </div>

              <div className={styles['topicStatusSummary']}>
                {(['mastered', 'needs_review', 'in_progress', 'available', 'locked'] as TopicNodeStatus[]).map((s) => {
                  const count = topics.filter((t2) => t2.status === s).length;
                  if (count === 0) return null;
                  const cfg = TOPIC_STATUS_STYLE[s];
                  return (
                    <span key={s} className={styles['statusSummaryPill']} style={{ color: cfg.color, background: cfg.bg }}>
                      {count} {t(`roadmap.topicStatus.${s}`)}
                    </span>
                  );
                })}
              </div>

              <div className={styles['drawerTopicList']}>
                {topics.map((node) => (
                  <DrawerTopicRow
                    key={node.slug}
                    node={node}
                    isRecommended={node.slug === recommendedSlug}
                    onOpen={(slug) => {
                      onClose();
                      onOpenTopic(slug);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {isCurrent && topics.length === 0 && (
            <div className={styles['drawerState']}>
              <div className={styles['drawerStateCircle']} style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Sparkles size={32} color="#6366f1" />
              </div>
              <p className={styles['drawerStateTitle']}>{t('progress.noTopicsYet')}</p>
              <p className={styles['drawerStateBody']}>{t('progress.noTopicsYetHint')}</p>
            </div>
          )}

          {lvl.status === 'completed' && (
            <div className={styles['drawerState']}>
              <div className={styles['drawerStateCircle']} style={{ background: 'rgba(34,197,94,0.1)' }}>
                <CheckCircle2 size={32} color="#22c55e" />
              </div>
              <p className={styles['drawerStateTitle']}>{t('roadmap.completedMsg')}</p>
            </div>
          )}

          {lvl.status === 'locked' && (
            <div className={styles['drawerState']}>
              <div className={styles['drawerStateCircle']} style={{ background: 'rgba(148,163,184,0.1)' }}>
                <Lock size={32} color="#94a3b8" />
              </div>
              <p className={styles['drawerStateTitle']}>{t('roadmap.locked')}</p>
              <p className={styles['drawerStateBody']}>{t('roadmap.lockedMsg')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}