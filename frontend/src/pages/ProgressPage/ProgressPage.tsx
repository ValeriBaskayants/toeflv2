import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Flame, Zap, Clock, Calendar, Trophy,
  RefreshCw, AlertCircle, BarChart2, ExternalLink,
  Lock, CheckCircle2, MapPin, X, Play, Sparkles,
  ChevronRight, RotateCcw, Circle,
  type LucideIcon,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import {
  fetchDashboard, requestLevelUp,
  selectProgressData, selectProgressIsLoading,
  selectProgressError, selectIsLevelingUp,
} from '@/store/Slices/ProgressSlice';
import {
  fetchRoadmap, selectRoadmapData,
  selectRoadmapLoading, selectRoadmapError,
} from '@/store/Slices/RoadmapSlice';
import type {
  RoadmapLevelSummary, RoadmapTopicNode,
  TopicNodeStatus,
} from '@/types/roadmap/Roadmap.types';
import type { DailyActivity } from '@/types/progress/Progress.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './ProgressPage.module.css';



const TOPIC_STATUS_CFG: Record<TopicNodeStatus, {
  label: string;
  color: string;
  bg: string;
  Icon: LucideIcon;
}> = {
  locked: { label: 'Locked', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', Icon: Lock },
  available: { label: 'Available', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', Icon: Circle },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: Play },
  mastered: { label: 'Mastered', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', Icon: CheckCircle2 },
  needs_review: { label: 'Review Due', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', Icon: RotateCcw },
};

const LEVEL_COLOR: Record<string, string> = {
  'A1': '#22c55e', 'A1+': '#16a34a',
  'A2': '#14b8a6', 'A2+': '#0d9488',
  'B1': '#3b82f6', 'B1+': '#2563eb',
  'B2': '#8b5cf6', 'B2+': '#7c3aed',
  'C1': '#f59e0b', 'C2': '#ef4444',
};



function topicPct(node: RoadmapTopicNode): number {
  const p = node.progress;
  const items = [
    p.grammar.required > 0 ? (p.grammar.completed / p.grammar.required) * 100 : 100,
    p.quiz.required > 0 ? (p.quiz.completed / p.quiz.required) * 100 : 100,
    p.reading.required > 0 ? (p.reading.completed / p.reading.required) * 100 : 100,
    p.listening.required > 0 ? (p.listening.completed / p.listening.required) * 100 : 100,
  ];
  return Math.min(100, Math.round(items.reduce((a, v) => a + v, 0) / items.length));
}

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



function SnakeNode({ lvl, readiness, onClick }: {
  lvl: RoadmapLevelSummary;
  readiness: number;
  onClick: (l: RoadmapLevelSummary) => void;
}) {
  const color = LEVEL_COLOR[lvl.displayName] ?? '#6366f1';
  const locked = lvl.status === 'locked';
  const R = 24;
  const circ = 2 * Math.PI * R;
  const off = circ * (1 - readiness / 100);

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onClick(lvl)}
      className={[
        styles['node'],
        lvl.status === 'completed' ? styles['nodeOk'] : '',
        lvl.status === 'current' ? styles['nodeCur'] : '',
        lvl.status === 'locked' ? styles['nodeLock'] : '',
      ].filter(Boolean).join(' ')}
      style={{ '--nc': color } as React.CSSProperties}
    >
      <svg className={styles['nodeSvg']} viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={R} fill="none" stroke={color}
          strokeWidth="3.5" style={{ opacity: 0.15 }} />
        {!locked && (
          <circle cx="30" cy="30" r={R} fill="none" stroke={color}
            strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={off}
            transform="rotate(-90 30 30)"
            className={styles['nodeRingFill']} />
        )}
      </svg>
      <span className={styles['nodeBg']}
        style={!locked ? { background: `${color}18` } : undefined} />
      <span className={styles['nodeLbl']}>{lvl.displayName}</span>
      {lvl.status === 'completed' && (
        <span className={styles['nodeChk']} style={{ color }}>✓</span>
      )}
      {lvl.status === 'current' && (
        <span className={styles['nodePulseRing']} style={{ background: color }} />
      )}
      {lvl.status === 'locked' && (
        <span className={styles['nodeLockIco']}><Lock size={9} /></span>
      )}
    </button>
  );
}



function SnakeTrack({ levels, readiness, onNodeClick }: {
  levels: RoadmapLevelSummary[];
  readiness: number;
  onNodeClick: (l: RoadmapLevelSummary) => void;
}) {
  const row0 = levels.slice(0, 5);
  const row1 = [...levels.slice(5)].reverse();

  function Connector({ a, b }: { a: RoadmapLevelSummary; b: RoadmapLevelSummary }) {
    const filled = a.status === 'completed' && (b.status === 'completed' || b.status === 'current');
    return (
      <div className={filled ? styles['connFilled'] : styles['conn']} />
    );
  }

  function Row({ row, reversed = false }: { row: RoadmapLevelSummary[]; reversed?: boolean }) {
    return (
      <div className={`${styles['snakeRow']} ${reversed ? styles['snakeRowRev'] : ''}`}>
        {row.map((lvl, i) => (
          <div key={lvl.level} className={styles['nodeWrap']}>
            <SnakeNode
              lvl={lvl}
              readiness={lvl.status === 'completed' ? 100 : lvl.status === 'current' ? readiness : 0}
              onClick={onNodeClick}
            />
            {i < row.length - 1 && (
              <Connector a={reversed ? row[i + 1]! : lvl} b={reversed ? lvl : row[i + 1]!} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles['snake']}>
      <Row row={row0} />
      {row1.length > 0 && (
        <>
          <div className={styles['snakeTurn']}>
            <svg className={styles['snakeTurnSvg']} viewBox="0 0 100 56" preserveAspectRatio="none">
              <path d="M 96 4 C 96 50, 4 6, 4 50"
                fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="5 3.5" />
            </svg>
          </div>
          <Row row={row1} reversed />
        </>
      )}
      <div className={styles['snakeLegend']}>
        {([
          { key: 'completed', color: '#22c55e', label: 'Completed' },
          { key: 'current', color: '#6366f1', label: 'Current' },
          { key: 'locked', color: 'var(--border)', label: 'Locked' },
        ] as const).map((s) => (
          <span key={s.key} className={styles['legItem']}>
            <span className={styles['legDot']} style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}



function TopicMiniCard({ node, isRecommended, onNavigate }: {
  node: RoadmapTopicNode;
  isRecommended: boolean;
  onNavigate: (slug: string) => void;
}) {
  const cfg = TOPIC_STATUS_CFG[node.status];
  const Icon = cfg.Icon;
  const pct = topicPct(node);
  const isLocked = node.status === 'locked';

  return (
    <div
      className={`${styles['topicRow']}
        ${isLocked ? styles['topicRowLocked'] : ''}
        ${isRecommended ? styles['topicRowRec'] : ''}`}
      style={{ '--tc': cfg.color } as React.CSSProperties}
    >
      {/* Status icon */}
      <div className={styles['topicStatusDot']} style={{ color: cfg.color, background: cfg.bg }}>
        <Icon size={12} />
      </div>

      {/* Title + progress */}
      <div className={styles['topicRowBody']}>
        <div className={styles['topicRowHead']}>
          <span className={styles['topicRowNum']}>#{node.order}</span>
          <span className={styles['topicRowTitle']}>{node.title}</span>
          {isRecommended && (
            <span className={styles['topicRecBadge']}>
              <Sparkles size={9} /> Next
            </span>
          )}
          {!node.isCore && <span className={styles['topicOptBadge']}>opt</span>}
        </div>
        {!isLocked && (
          <div className={styles['topicRowBar']}>
            <div className={styles['topicRowBarFill']}
              style={{ width: `${pct}%`, background: cfg.color }} />
          </div>
        )}
      </div>

      {/* CTA */}
      {!isLocked && node.status !== 'mastered' && (
        <button
          type="button"
          className={styles['topicRowBtn']}
          style={{ '--tc': cfg.color } as React.CSSProperties}
          onClick={() => onNavigate(node.slug)}
        >
          {node.status === 'needs_review' ? 'Review' :
            node.status === 'in_progress' ? 'Continue' : 'Start'}
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}



function LevelDrawer({ lvl, topics, recommendedSlug, readiness, coreCount, coreMastered,
  onClose, onLevelUp, isLevelingUp, isReadyForTest, onNavigate }: {
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
    onNavigate: (slug: string) => void;
  }) {
  const color = LEVEL_COLOR[lvl.displayName] ?? '#6366f1';
  const isCurrent = lvl.status === 'current';
  const R = 27;
  const circ = 2 * Math.PI * R;
  const displayReadiness = lvl.status === 'completed' ? 100 : lvl.status === 'current' ? readiness : 0;
  const off = circ * (1 - displayReadiness / 100);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const statusChipCls =
    lvl.status === 'completed' ? styles['chipOk'] :
      lvl.status === 'current' ? styles['chipCur'] : styles['chipLock'];

  return (
    <div
      className={styles['drawerOverlay']}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true"
    >
      <div className={styles['drawer']}>
        <div className={styles['drawerBand']} style={{ background: color }} />

        {/* Header */}
        <div className={styles['drawerHead']}>
          {/* Radial circle */}
          <div className={styles['drawerCircleWrap']}>
            <svg viewBox="0 0 64 64" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <circle cx="32" cy="32" r={R} fill="none" stroke={color}
                strokeWidth="3.5" style={{ opacity: 0.15 }} />
              {lvl.status !== 'locked' && (
                <circle cx="32" cy="32" r={R} fill="none" stroke={color}
                  strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={off}
                  transform="rotate(-90 32 32)"
                  className={styles['drawerCircleAnim']} />
              )}
            </svg>
            <div className={styles['drawerCircleNum']} style={{ color }}>
              {displayReadiness}%
            </div>
          </div>

          {/* Meta */}
          <div className={styles['drawerMeta']}>
            <div className={styles['drawerLvlName']} style={{ color }}>
              Level {lvl.displayName}
            </div>
            <div className={`${styles['drawerChip']} ${statusChipCls}`}>
              {lvl.status === 'completed' && <CheckCircle2 size={11} />}
              {lvl.status === 'current' && <MapPin size={11} />}
              {lvl.status === 'locked' && <Lock size={11} />}
              {lvl.status === 'completed' ? 'Completed' :
                lvl.status === 'current' ? 'Current level' : 'Locked'}
            </div>
            {isCurrent && (
              <div className={styles['drawerTopicStat']}>
                {coreMastered}/{coreCount} core topics mastered
              </div>
            )}
          </div>

          <button type="button" className={styles['drawerClose']}
            onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Readiness bar */}
        <div className={styles['drawerBar']}>
          <div className={styles['drawerBarFill']}
            style={{ width: `${displayReadiness}%`, background: color }} />
        </div>

        {/* Body */}
        <div className={styles['drawerBody']}>
          {/* Level-up button */}
          {isReadyForTest && isCurrent && (
            <button type="button" className={styles['drawerTestBtn']}
              onClick={onLevelUp} disabled={isLevelingUp}>
              <Trophy size={15} />
              {isLevelingUp ? 'Processing…' : 'Take Level Test'}
            </button>
          )}

          {/* Topic list for current level */}
          {isCurrent && topics.length > 0 && (
            <div className={styles['drawerTopicSection']}>
              <div className={styles['drawerSectionTitle']}>
                Curriculum — {topics.length} topics
              </div>

              {/* Status summary pills */}
              <div className={styles['topicStatusSummary']}>
                {(
                  [
                    { s: 'mastered' as TopicNodeStatus, label: 'Mastered' },
                    { s: 'needs_review' as TopicNodeStatus, label: 'Review' },
                    { s: 'in_progress' as TopicNodeStatus, label: 'In progress' },
                    { s: 'available' as TopicNodeStatus, label: 'Available' },
                    { s: 'locked' as TopicNodeStatus, label: 'Locked' },
                  ]
                ).map(({ s, label }) => {
                  const count = topics.filter((t) => t.status === s).length;
                  if (count === 0) return null;
                  const cfg = TOPIC_STATUS_CFG[s];
                  return (
                    <span key={s} className={styles['statusSummaryPill']}
                      style={{ color: cfg.color, background: cfg.bg }}>
                      {count} {label}
                    </span>
                  );
                })}
              </div>

              {/* All topics in order */}
              <div className={styles['drawerTopicList']}>
                {topics.map((node) => (
                  <DrawerTopicRow
                    key={node.slug}
                    node={node}
                    isRecommended={node.slug === recommendedSlug}
                    onNavigate={(slug) => { onClose(); onNavigate(slug); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {lvl.status === 'completed' && (
            <div className={styles['drawerState']}>
              <div className={styles['drawerStateCircle']} style={{ background: 'rgba(34,197,94,0.1)' }}>
                <CheckCircle2 size={32} color="#22c55e" />
              </div>
              <p className={styles['drawerStateTitle']}>Level completed!</p>
              <p className={styles['drawerStateBody']}>
                You've successfully mastered all requirements for {lvl.displayName}.
              </p>
            </div>
          )}

          {/* Locked */}
          {lvl.status === 'locked' && (
            <div className={styles['drawerState']}>
              <div className={styles['drawerStateCircle']} style={{ background: 'rgba(148,163,184,0.1)' }}>
                <Lock size={32} color="#94a3b8" />
              </div>
              <p className={styles['drawerStateTitle']}>Level locked</p>
              <p className={styles['drawerStateBody']}>
                Complete and pass the test for your current level to unlock {lvl.displayName}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



function DrawerTopicRow({ node, isRecommended, onNavigate }: {
  node: RoadmapTopicNode;
  isRecommended: boolean;
  onNavigate: (slug: string) => void;
}) {
  const cfg = TOPIC_STATUS_CFG[node.status];
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
      className={`${styles['dTopicRow']}
        ${isLocked ? styles['dTopicRowLocked'] : ''}
        ${isRecommended ? styles['dTopicRowRec'] : ''}`}
      style={{ '--tc': cfg.color } as React.CSSProperties}
    >
      {/* Left accent */}
      <div className={styles['dTopicAccent']} style={{ background: cfg.color }} />

      {/* Status icon */}
      <div className={styles['dTopicIcon']}
        style={{ color: cfg.color, background: cfg.bg }}>
        <Icon size={13} />
      </div>

      {/* Content */}
      <div className={styles['dTopicContent']}>
        <div className={styles['dTopicTitleRow']}>
          <span className={styles['dTopicNum']}>#{node.order}</span>
          <span className={styles['dTopicTitle']}>{node.title}</span>
          {isRecommended && (
            <span className={styles['dTopicRecBadge']}>
              <Sparkles size={9} /> next
            </span>
          )}
          {!node.isCore && <span className={styles['dTopicOpt']}>opt</span>}
        </div>

        {/* Skill dots */}
        {!isLocked && (
          <div className={styles['dTopicSkills']}>
            {skillDots.map((d) => (
              <span key={d.label} className={styles['dTopicSkillDot']}
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
              <div className={styles['dTopicBarFill']}
                style={{ width: `${pct}%`, background: cfg.color }} />
            </div>
          </div>
        )}

        {/* Resources */}
        {!isLocked && node.resources.length > 0 && (
          <div className={styles['dTopicResources']}>
            {node.resources.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                className={styles['dTopicResLink']}>
                <ExternalLink size={10} />
                {r.title}
              </a>
            ))}
          </div>
        )}

        {/* Lock reason */}
        {isLocked && (node.missingPrerequisites?.length ?? 0) > 0 && (
          <div className={styles['dTopicLockMsg']}>
            <Lock size={10} />
            Requires: {node.missingPrerequisites.slice(0, 2).join(', ')}
            {node.missingPrerequisites.length > 2 && ` +${node.missingPrerequisites.length - 2}`}
          </div>
        )}
      </div>

      {/* Navigate button */}
      {!isLocked && node.status !== 'mastered' && (
        <button
          type="button"
          className={styles['dTopicBtn']}
          style={{ '--tc': cfg.color } as React.CSSProperties}
          onClick={() => onNavigate(node.slug)}
        >
          {node.status === 'needs_review' ? 'Review' :
            node.status === 'in_progress' ? 'Go' : 'Start'}
        </button>
      )}
    </div>
  );
}



function Heatmap({ recentActivity }: { recentActivity: DailyActivity[] }) {
  const cells = buildCells(recentActivity);
  const weeks = Array.from({ length: 5 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <div className={`${styles['section']} ${styles['heatSection']}`}>
      <div className={styles['heatHead']}>
        <h2 className={styles['sectionHeading']}>Activity — last 35 days</h2>
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
                <div key={c.date}
                  className={`${styles['heatCell']} ${styles[`hi${c.intensity}`]}`}
                  title={c.xp > 0 ? `${c.date}: ${c.xp} XP` : c.date}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles['heatLeg']}>
        <span className={styles['heatLegLbl']}>Less</span>
        {([0, 1, 2, 3, 4] as const).map((i) => (
          <div key={i} className={`${styles['heatLegCell']} ${styles[`hi${i}`]}`} />
        ))}
        <span className={styles['heatLegLbl']}>More</span>
      </div>
    </div>
  );
}



export default function ProgressPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector(selectUser);
  const dashData = useAppSelector(selectProgressData);
  const dashLoading = useAppSelector(selectProgressIsLoading);
  const dashError = useAppSelector(selectProgressError);
  const isLevelingUp = useAppSelector(selectIsLevelingUp);
  const roadmapData = useAppSelector(selectRoadmapData);
  const rmLoading = useAppSelector(selectRoadmapLoading);
  const rmError = useAppSelector(selectRoadmapError);

  const [selectedLevel, setSelectedLevel] = useState<RoadmapLevelSummary | null>(null);

  useEffect(() => {
    if (dashData === null && !dashLoading && dashError === null)
      void dispatch(fetchDashboard());
    if (roadmapData === null && !rmLoading && rmError === null)
      void dispatch(fetchRoadmap());
  }, [dashData, dashLoading, dashError, roadmapData, rmLoading, rmError, dispatch]);

  const handleRetry = useCallback(() => {
    void dispatch(fetchDashboard());
    void dispatch(fetchRoadmap());
  }, [dispatch]);

  const handleLevelUp = useCallback(() => void dispatch(requestLevelUp()), [dispatch]);

  const handleNavigate = useCallback((slug: string) => {
    navigate(`/grammar?topicSlug=${slug}`);
  }, [navigate]);

  if (user === null) return null;
  if ((dashLoading && !dashData) || (rmLoading && !roadmapData))
    return <FullPageSpinner label="Loading your progress…" />;

  const totalMin = dashData?.recentActivity.reduce((s, a) => s + a.minutesSpent, 0) ?? 0;
  const active30 = dashData ? (() => {
    const cut = new Date();
    cut.setDate(cut.getDate() - 30);
    const cs = cut.toISOString().slice(0, 10);
    return dashData.recentActivity.filter((a) => a.date >= cs && a.xpEarned > 0).length;
  })() : 0;

  const anyErr = dashError ?? rmError;
  const readiness = roadmapData?.curriculumReadinessPercent ?? 0;
  const topics = roadmapData?.currentLevelTopics ?? [];
  const recommendedSlug = roadmapData?.nextRecommendedTopicSlug ?? null;
  const coreMastered = roadmapData?.coreTopicsMasteredCount ?? 0;
  const coreTotal = roadmapData?.coreTopicsTotalCount ?? 0;
  const isReadyForTest = dashData?.progress.isReadyForTest ?? false;

  const activeTopic = recommendedSlug ? topics.find((t) => t.slug === recommendedSlug) : null;

  return (
    <div className={styles['page']}>
      {/* ── Header ── */}
      <header className={styles['header']}>
        <div className={styles['headerLeft']}>
          <div className={styles['eyebrow']}>
            <span className={styles['eyebrowDot']} />
            TOEFL Journey
          </div>
          <h1 className={styles['pageTitle']}>Progress</h1>
          <p className={styles['pageSubtitle']}>
            Your learning path across all skills and grammar topics
          </p>
        </div>
        {isReadyForTest && (
          <button type="button" className={styles['testBtn']}
            onClick={handleLevelUp} disabled={isLevelingUp}>
            <Trophy size={15} />
            {isLevelingUp ? 'Leveling up…' : 'Take Level Test'}
          </button>
        )}
      </header>

      {/* ── Error ── */}
      {anyErr && (
        <div className={styles['errBanner']}>
          <AlertCircle size={15} />
          <span>{anyErr}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── Stats pills ── */}
      {dashData && (
        <div className={styles['statsStrip']}>
          {([
            { Icon: TrendingUp, val: dashData.currentLevel, lbl: 'Current level', cls: 'pilPurple' },
            { Icon: Flame, val: String(dashData.streak), lbl: 'Day streak', cls: 'pilAmber' },
            { Icon: Zap, val: dashData.totalXp.toLocaleString(), lbl: 'Total XP', cls: 'pilGreen' },
            { Icon: Clock, val: String(totalMin), lbl: 'Minutes studied', cls: 'pilBlue' },
            { Icon: Calendar, val: String(active30), lbl: 'Active days (30d)', cls: 'pilRose' },
          ] as const).map(({ Icon, val, lbl, cls }) => (
            <div key={lbl} className={styles['statPill']}>
              <div className={`${styles['statPillIco']} ${styles[cls]}`}><Icon size={14} /></div>
              <div>
                <div className={styles['statPillVal']}>{val}</div>
                <div className={styles['statPillLbl']}>{lbl}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Roadmap section ── */}
      {roadmapData && (
        <div className={`${styles['section']} ${styles['roadmapSection']}`}>
          <div className={styles['roadmapTopRow']}>
            <div>
              <h2 className={styles['sectionHeading']}>Level Roadmap</h2>
              <p className={styles['roadmapSub']}>
                Click any level to see its topics and requirements
              </p>
            </div>
            <div className={styles['roadmapRight']}>
              <div className={styles['readinessBig']}>{readiness}%</div>
              <div className={styles['readinessLabel']}>curriculum ready</div>
            </div>
          </div>

          <div className={styles['roadmapBarWrap']}>
            <div className={styles['roadmapBarTrack']}>
              <div className={styles['roadmapBarFill']}
                style={{ width: `${readiness}%` }} />
            </div>
            <span className={styles['roadmapBarHint']}>
              {coreMastered}/{coreTotal} core topics mastered in {roadmapData.currentLevel}
            </span>
          </div>

          <SnakeTrack
            levels={roadmapData.levels}
            readiness={readiness}
            onNodeClick={setSelectedLevel}
          />
        </div>
      )}

      {/* ── Next recommended callout ── */}
      {activeTopic && (
        <div className={styles['nextCallout']}>
          <div className={styles['nextCalloutLeft']}>
            <span className={styles['nextCalloutEye']}>
              <Sparkles size={12} /> Recommended next
            </span>
            <span className={styles['nextCalloutTitle']}>{activeTopic.title}</span>
            <span className={styles['nextCalloutSummary']}>
              {(activeTopic.summary ?? '').slice(0, 90)}
              {(activeTopic.summary ?? '').length > 90 ? '…' : ''}
            </span>
          </div>
          <button
            type="button"
            className={styles['nextCalloutBtn']}
            onClick={() => handleNavigate(activeTopic.slug)}
          >
            {activeTopic.status === 'in_progress' ? 'Continue' :
              activeTopic.status === 'needs_review' ? 'Review' : 'Start'}
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* ── Topic curriculum for current level ── */}
      {topics.length > 0 && (
        <div className={`${styles['section']} ${styles['topicSection']}`}>
          <div className={styles['topicSectionHead']}>
            <div>
              <h2 className={styles['sectionHeading']}>
                {roadmapData?.currentLevel} — Grammar Curriculum
              </h2>
              <p className={styles['topicSectionSub']}>
                {topics.length} topics in curriculum order
              </p>
            </div>
            {/* Compact status strip */}
            <div className={styles['topicSummaryPills']}>
              {([
                { s: 'in_progress' as TopicNodeStatus },
                { s: 'available' as TopicNodeStatus },
                { s: 'mastered' as TopicNodeStatus },
                { s: 'needs_review' as TopicNodeStatus },
                { s: 'locked' as TopicNodeStatus },
              ]).map(({ s }) => {
                const count = topics.filter((t) => t.status === s).length;
                if (count === 0) return null;
                const cfg = TOPIC_STATUS_CFG[s];
                return (
                  <span key={s} className={styles['topicSumPill']}
                    style={{ color: cfg.color, background: cfg.bg }}>
                    {count}
                  </span>
                );
              })}
            </div>
          </div>

          <div className={styles['topicList']}>
            {topics.map((node) => (
              <TopicMiniCard
                key={node.slug}
                node={node}
                isRecommended={node.slug === recommendedSlug}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Heatmap ── */}
      {dashData && <Heatmap recentActivity={dashData.recentActivity} />}

      {/* ── Ready banner ── */}
      {isReadyForTest && dashData && (
        <div className={styles['readyBanner']}>
          <Trophy size={20} className={styles['readyIco']} />
          <div>
            <strong>You're ready for the level test!</strong>
            <p>All requirements for {dashData.currentLevel} have been met.</p>
          </div>
          <button type="button" className={styles['readyBtn']}
            onClick={handleLevelUp} disabled={isLevelingUp}>
            {isLevelingUp ? 'Processing…' : 'Level Up →'}
          </button>
        </div>
      )}

      {/* ── Empty ── */}
      {!dashData && !roadmapData && !dashLoading && !rmLoading && !anyErr && (
        <div className={styles['emptyState']}>
          <BarChart2 size={40} />
          <p>No progress data yet. Start practicing to see your path here.</p>
        </div>
      )}

      {/* ── Drawer ── */}
      {selectedLevel && (
        <LevelDrawer
          lvl={selectedLevel}
          topics={topics}
          recommendedSlug={recommendedSlug}
          readiness={readiness}
          coreCount={coreTotal}
          coreMastered={coreMastered}
          onClose={() => setSelectedLevel(null)}
          onLevelUp={handleLevelUp}
          isLevelingUp={isLevelingUp}
          isReadyForTest={isReadyForTest}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}