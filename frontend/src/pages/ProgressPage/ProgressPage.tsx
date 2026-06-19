import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, Flame, Zap, Clock, Calendar, Trophy,
  RefreshCw, AlertCircle, BarChart2, ExternalLink,
  Lock, CheckCircle2, MapPin, BookOpen, PenLine,
  Headphones, CheckCheck, Layers, Target, X, Play,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';
import { selectUser }                     from '@/store/Slices/AuthSlice';
import {
  fetchDashboard, requestLevelUp,
  selectProgressData, selectProgressIsLoading,
  selectProgressError, selectIsLevelingUp,
} from '@/store/Slices/ProgressSlice';
import {
  fetchRoadmap, selectRoadmapData,
  selectRoadmapLoading, selectRoadmapError,
} from '@/store/Slices/RoadmapSlice';
import type { RoadmapLevelNode, SkillTask, ExternalResource } from '@/types/roadmap/Roadmap.types';
import type { DailyActivity } from '@/types/progress/Progress.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './ProgressPage.module.css';


const SKILL_ICON: Record<string, React.FC<{ size: number }>> = {
  grammar:    (p) => <CheckCheck {...p} />,
  vocabulary: (p) => <Layers    {...p} />,
  reading:    (p) => <BookOpen  {...p} />,
  writing:    (p) => <PenLine   {...p} />,
  listening:  (p) => <Headphones {...p} />,
  quiz:       (p) => <Target    {...p} />,
};
const SKILL_COLOR: Record<string, string> = {
  grammar: '#14b8a6', vocabulary: '#8b5cf6',
  reading: '#22c55e', writing:    '#ec4899',
  listening: '#f59e0b', quiz:     '#6366f1',
};
const LEVEL_COLOR: Record<string, string> = {
  'A1':'#22c55e','A1+':'#16a34a',
  'A2':'#14b8a6','A2+':'#0d9488',
  'B1':'#3b82f6','B1+':'#2563eb',
  'B2':'#8b5cf6','B2+':'#7c3aed',
  'C1':'#f59e0b', 'C2':'#ef4444',
};


function buildCells(act: DailyActivity[]) {
  const map = new Map(act.map((a) => [a.date, a.xpEarned]));
  return Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    const date = d.toISOString().slice(0, 10);
    const xp   = map.get(date) ?? 0;
    const intensity: 0|1|2|3|4 = xp===0?0:xp<30?1:xp<80?2:xp<150?3:4;
    return { date, xp, intensity };
  });
}
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}


function RadialProgress({ sms, color, size = 52 }: { sms: number; color: string; size?: number }) {
  const r    = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - Math.min(100, sms) / 100);
  const cx   = size / 2;
  return (
    <div className={styles['bdRadial']} style={{ width: size, height: size }}>
      <svg className={styles['bdRadialSvg']} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="3.5"
          className={styles['bdRadialTrack']} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off}
          transform={`rotate(-90 ${cx} ${cx})`}
          className={styles['bdRadialFill']} />
      </svg>
      <div className={styles['bdRadialNum']}>{sms}</div>
    </div>
  );
}


function SnakeNode({ node, onClick }: { node: RoadmapLevelNode; onClick: (n: RoadmapLevelNode) => void }) {
  const color  = LEVEL_COLOR[node.displayName] ?? '#6366f1';
  const locked = node.status === 'locked';
  const R      = 26;
  const circ   = 2 * Math.PI * R;
  const off    = circ * (1 - node.readinessPercent / 100);

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onClick(node)}
      aria-label={`${node.displayName} ${node.status} ${node.readinessPercent}%`}
      className={[
        styles['node'],
        node.status === 'completed' ? styles['nodeOk']  : '',
        node.status === 'current'   ? styles['nodeCur'] : '',
        node.status === 'locked'    ? styles['nodeLock']: '',
      ].filter(Boolean).join(' ')}
      style={{ '--nc': color } as React.CSSProperties}
    >
      <svg className={styles['nodeSvg']} viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={R} fill="none"
          stroke={color} strokeWidth="3.5"
          className={styles['nodeRingTrack']} />
        {!locked && (
          <circle cx="30" cy="30" r={R} fill="none"
            stroke={color} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={off}
            transform="rotate(-90 30 30)"
            className={styles['nodeRingFill']} />
        )}
      </svg>
      <span className={styles['nodeBg']}
        style={!locked ? { background: `${color}14` } : undefined} />
      <span className={styles['nodeLbl']}>{node.displayName}</span>
      {node.status === 'completed' && (
        <span className={styles['nodeChk']} style={{ color }}>✓</span>
      )}
      {node.status === 'current' && (
        <span className={styles['nodePulseRing']} style={{ background: color }} />
      )}
      {node.status === 'locked' && (
        <span className={styles['nodeLockIco']}><Lock size={9} /></span>
      )}
    </button>
  );
}


function SnakeTrack({ nodes, onNodeClick }: { nodes: RoadmapLevelNode[]; onNodeClick: (n: RoadmapLevelNode) => void }) {
  const { t } = useTranslation();
  const row0  = nodes.slice(0, 5);
  const row1  = [...nodes.slice(5)].reverse(); 

  function rowConnectors(row: RoadmapLevelNode[], reversed = false) {
    const result: React.ReactNode[] = [];
    for (let i = 0; i < row.length; i++) {
      result.push(<SnakeNode key={row[i]!.level} node={row[i]!} onClick={onNodeClick} />);
      if (i < row.length - 1) {
        const curr = row[i]!;
        const next = row[i + 1]!;
        const bothDone = curr.status === 'completed' && next.status === 'completed';
        const currDone = curr.status === 'completed' && next.status === 'current';
        const cls = bothDone || (!reversed && currDone)
          ? styles['snakeConnLineFilled']
          : styles['snakeConnLine'];
        result.push(<div key={`c-${i}`} className={cls} />);
      }
    }
    return result;
  }

  return (
    <div className={styles['snake']}>
      <div className={styles['snakeRow']}>
        {rowConnectors(row0, false)}
      </div>

      {/* U-turn SVG */}
      <div className={styles['snakeTurn']}>
        <svg className={styles['snakeTurnSvg']} viewBox="0 0 100 56" preserveAspectRatio="none">
          <path
            d="M 96 4 C 96 50, 4 6, 4 50"
            fill="none" stroke="var(--border)"
            strokeWidth="2" strokeDasharray="5 3.5"
          />
        </svg>
      </div>

      <div className={`${styles['snakeRow']} ${styles['snakeRowRev']}`}>
        {rowConnectors(row1, true)}
      </div>

      <div className={styles['snakeLegend']}>
        {(['completed','current','locked'] as const).map((s) => (
          <span key={s} className={styles['legItem']}>
            <span className={styles['legDot']} style={{
              background: s==='completed'?'#22c55e':s==='current'?'var(--accent)':'var(--border)',
            }} />
            {t(`roadmap.${s}`)}
          </span>
        ))}
      </div>
    </div>
  );
}


function SkillBreakdown({ node }: { node: RoadmapLevelNode }) {
  const { t }    = useTranslation();
  const navigate = useNavigate();

  return (
    <div className={`${styles['section']} ${styles['bdSection']}`}>
      <h2 className={styles['bdHeading']}>
        {t('progress.skillBreakdown')} — {node.displayName}
      </h2>
      <div className={styles['bdGrid']}>
        {node.skills.map((sk) => {
          const Icon = SKILL_ICON[sk.skill];
          const sc   = SKILL_COLOR[sk.skill] ?? '#6366f1';
          return (
            <div key={sk.skill}
              className={`${styles['bdCard']} ${sk.isBlocking ? styles['bdCardWeak'] : ''}`}
              style={{ '--sc': sc } as React.CSSProperties}
            >
              <div className={styles['bdRadialRow']}>
                <RadialProgress sms={sk.sms} color={sc} />
                <div className={styles['bdInfo']}>
                  <span className={styles['bdName']}>{sk.label}</span>
                  <span className={styles['bdSub']}>
                    {sk.accuracyMin > 0
                      ? `${Math.round(sk.accuracy)}% / ${sk.accuracyMin}%`
                      : `${sk.completed}/${sk.required}`}
                  </span>
                  {sk.isBlocking && (
                    <span className={styles['bdWeak']}>⚠ {t('roadmap.blocking')}</span>
                  )}
                </div>
              </div>
              <div className={styles['bdFoot']}>
                <span className={styles['bdCount']}>{sk.completed}/{sk.required}</span>
                {sk.remaining > 0 && (
                  <button type="button" className={styles['bdCta']}
                    onClick={() => navigate(sk.route)}>
                    {sk.cta} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function Heatmap({ recentActivity }: { recentActivity: DailyActivity[] }) {
  const { t }   = useTranslation();
  const cells   = buildCells(recentActivity);
  const weeks   = Array.from({ length: 5 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <div className={`${styles['section']} ${styles['heatSection']}`}>
      <h2 className={styles['heatHeading']}>{t('progress.activity')}</h2>
      <div className={styles['heatGrid']}>
        <div className={styles['heatDays']}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
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
        <span className={styles['heatLegLbl']}>{t('progress.less')}</span>
        {([0,1,2,3,4] as const).map((i) => (
          <div key={i} className={`${styles['heatLegCell']} ${styles[`hi${i}`]}`} />
        ))}
        <span className={styles['heatLegLbl']}>{t('progress.more')}</span>
      </div>
    </div>
  );
}


function LevelDrawer({ node, onClose, onLevelUp, isLevelingUp }: {
  node: RoadmapLevelNode; onClose: () => void;
  onLevelUp: () => void; isLevelingUp: boolean;
}) {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const color    = LEVEL_COLOR[node.displayName] ?? '#6366f1';
  const R        = 27;
  const circ     = 2 * Math.PI * R;
  const off      = circ * (1 - node.readinessPercent / 100);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const statusCls =
    node.status === 'completed' ? styles['drawerStatusOk'] :
    node.status === 'current'   ? styles['drawerStatusCur'] :
    styles['drawerStatusLock'];

  return (
    <div
      className={styles['drawerOverlay']}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true"
    >
      <div className={styles['drawer']}>
        {/* colour band at top */}
        <div className={styles['drawerBand']} style={{ background: color }} />

        {/* header */}
        <div className={styles['drawerHead']}>
          <div className={styles['drawerLevelCircle']}>
            <svg className={styles['drawerCircleSvg']} viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={R} fill="none" stroke={color}
                strokeWidth="3.5" className={styles['drawerRingTrack']}
                style={{ opacity: 0.15 }} />
              {node.status !== 'locked' && (
                <circle cx="32" cy="32" r={R} fill="none" stroke={color}
                  strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={off}
                  transform="rotate(-90 32 32)"
                  className={styles['drawerCircleAnim']} />
              )}
            </svg>
            <div className={styles['drawerCircleNum']}
              style={{ color }}>{node.readinessPercent}%</div>
          </div>

          <div className={styles['drawerMeta']}>
            <div className={styles['drawerLvlName']} style={{ color }}>
              {node.displayName}
            </div>
            <div className={`${styles['drawerStatusChip']} ${statusCls}`}>
              {node.status === 'completed' && <CheckCircle2 size={11} />}
              {node.status === 'current'   && <MapPin       size={11} />}
              {node.status === 'locked'    && <Lock         size={11} />}
              {t(`roadmap.${node.status}`)}
            </div>
            {node.estimatedDays[1] > 0 && (
              <div className={styles['drawerEst']}>
                ≈ {node.estimatedDays[0]}–{node.estimatedDays[1]} {t('roadmap.days')}
              </div>
            )}
          </div>

          <button type="button" className={styles['drawerClose']}
            onClick={onClose} aria-label={t('common.close')}>
            <X size={16} />
          </button>
        </div>

        {/* readiness bar */}
        <div className={styles['drawerReadBar']}>
          <div className={styles['drawerReadFill']}
            style={{ width: `${node.readinessPercent}%`, background: color }} />
        </div>

        {/* scrollable body */}
        <div className={styles['drawerBody']}>

          {node.isReadyForTest && node.status === 'current' && (
            <button type="button" className={styles['drawerTestBtn']}
              onClick={onLevelUp} disabled={isLevelingUp}>
              <Trophy size={15} />
              {isLevelingUp ? t('dashboard.levelingUp') : t('progress.takeLevelTest')}
            </button>
          )}

          {/* skill tasks */}
          {node.skills.length > 0 && (
            <div className={styles['drawerSection']}>
              <div className={styles['drawerSectionTitle']}>{t('roadmap.requirements')}</div>
              {node.skills.map((sk) => {
                const Icon = SKILL_ICON[sk.skill];
                const sc   = SKILL_COLOR[sk.skill] ?? '#6366f1';
                return (
                  <div key={sk.skill}
                    className={`${styles['dSkRow']} ${sk.isBlocking ? styles['dSkBlocking'] : ''}`}
                  >
                    <div className={styles['dSkIco']}
                      style={{ color: sc, background: `${sc}18` }}>
                      {Icon && <Icon size={13} />}
                    </div>
                    <div className={styles['dSkMain']}>
                      <div className={styles['dSkNameRow']}>
                        <span className={styles['dSkName']}>{sk.label}</span>
                        <span className={styles['dSkSms']} style={{ color: sc }}>{sk.sms}</span>
                      </div>
                      <div className={styles['dSkBar']}>
                        <div className={styles['dSkFill']}
                          style={{ width: `${sk.sms}%`, background: sc }} />
                      </div>
                      <span className={styles['dSkMeta']}>
                        {sk.completed}/{sk.required}
                        {sk.remaining > 0 && ` · ${sk.remaining} ${t('roadmap.remaining')}`}
                        {sk.accuracyMin > 0 && ` · ${Math.round(sk.accuracy)}%/${sk.accuracyMin}%`}
                      </span>
                    </div>
                    <div className={styles['dSkCtaWrap']}>
                      {sk.isBlocking && (
                        <span className={styles['blockTag']}>{t('roadmap.blocking')}</span>
                      )}
                      {node.status === 'current' && sk.remaining > 0 && (
                        <button type="button"
                          className={styles['dSkCta']}
                          style={{ '--sc': sc } as React.CSSProperties}
                          onClick={() => navigate(sk.route)}>
                          {sk.cta}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* bonus resources */}
          {node.bonusResources.length > 0 && (
            <div className={styles['drawerSection']}>
              <div className={styles['drawerSectionTitle']}>{t('roadmap.bonusResources')}</div>
              {node.bonusResources.map((r) => (
                <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                  className={styles['resCard']}>
                  <div className={styles['resType']}>
                    {r.type === 'video'   ? <Play       size={13} /> :
                     r.type === 'podcast' ? <Headphones size={13} /> :
                     <ExternalLink size={13} />}
                  </div>
                  <div className={styles['resInfo']}>
                    <span className={styles['resTitle']}>{r.title}</span>
                    <span className={styles['resDesc']}>{r.description}</span>
                  </div>
                  <ExternalLink size={11} className={styles['resArr']} />
                </a>
              ))}
            </div>
          )}

          {node.status === 'locked' && (
            <div className={styles['drawerState']}>
              <Lock size={28} className={styles['drawerStateIco']} />
              <p>{t('roadmap.lockedMsg')}</p>
            </div>
          )}
          {node.status === 'completed' && (
            <div className={styles['drawerState']}>
              <CheckCircle2 size={28} className={styles['drawerStateOkIco']} />
              <p>{t('roadmap.completedMsg')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function ProgressPage() {
  const { t }    = useTranslation();
  const dispatch = useAppDispatch();

  const user         = useAppSelector(selectUser);
  const dashData     = useAppSelector(selectProgressData);
  const dashLoading  = useAppSelector(selectProgressIsLoading);
  const dashError    = useAppSelector(selectProgressError);
  const isLevelingUp = useAppSelector(selectIsLevelingUp);
  const roadmapData  = useAppSelector(selectRoadmapData);
  const rmLoading    = useAppSelector(selectRoadmapLoading);
  const rmError      = useAppSelector(selectRoadmapError);

  const [selectedNode, setSelectedNode] = useState<RoadmapLevelNode | null>(null);

  useEffect(() => {
    if (dashData === null && !dashLoading && dashError === null)  void dispatch(fetchDashboard());
    if (roadmapData === null && !rmLoading && rmError === null)   void dispatch(fetchRoadmap());
  }, [dashData, dashLoading, dashError, roadmapData, rmLoading, rmError, dispatch]);

  const handleRetry  = useCallback(() => { void dispatch(fetchDashboard()); void dispatch(fetchRoadmap()); }, [dispatch]);
  const handleLevelUp = useCallback(() => { void dispatch(requestLevelUp()); }, [dispatch]);

  if (user === null) return null;
  if ((dashLoading && !dashData) || (rmLoading && !roadmapData))
    return <FullPageSpinner label={t('progress.loading')} />;

  const totalMin   = dashData?.recentActivity.reduce((s, a) => s + a.minutesSpent, 0) ?? 0;
  const active30   = dashData ? (() => {
    const cut = new Date(); cut.setDate(cut.getDate() - 30);
    const cs  = cut.toISOString().slice(0, 10);
    return dashData.recentActivity.filter((a) => a.date >= cs && a.xpEarned > 0).length;
  })() : 0;

  const currentNode = roadmapData?.nodes.find((n) => n.status === 'current') ?? null;
  const anyErr      = dashError ?? rmError;

  return (
    <div className={styles['page']}>

      {/* ── Header ── */}
      <header className={styles['header']}>
        <div className={styles['headerLeft']}>
          <div className={styles['eyebrow']}>
            <span className={styles['eyebrowDot']} />
            TOEFL Journey
          </div>
          <h1 className={styles['pageTitle']}>{t('progress.title')}</h1>
          <p className={styles['pageSubtitle']}>{t('progress.subtitle')}</p>
        </div>
        {dashData?.progress.isReadyForTest && (
          <button type="button" className={styles['testBtn']}
            onClick={handleLevelUp} disabled={isLevelingUp}>
            <Trophy size={15} />
            {isLevelingUp ? t('dashboard.levelingUp') : t('progress.takeLevelTest')}
          </button>
        )}
      </header>

      {/* ── Error ── */}
      {anyErr && (
        <div className={styles['errBanner']}>
          <AlertCircle size={15} /><span>{anyErr}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={13} /> {t('common.retry')}
          </button>
        </div>
      )}

      {/* ── Stats pills ── */}
      {dashData && (
        <div className={styles['statsStrip']}>
          {([
            { Icon: TrendingUp, val: dashData.currentLevel,            lbl: t('dashboard.statLevel'),  cls: 'pilPurple' },
            { Icon: Flame,      val: String(dashData.streak),           lbl: t('dashboard.statStreak'), cls: 'pilAmber'  },
            { Icon: Zap,        val: dashData.totalXp.toLocaleString(), lbl: t('dashboard.statXp'),     cls: 'pilGreen'  },
            { Icon: Clock,      val: String(totalMin),                  lbl: t('progress.minutes'),     cls: 'pilBlue'   },
            { Icon: Calendar,   val: String(active30),                  lbl: t('progress.activeDays'),  cls: 'pilRose'   },
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

      {/* ── Roadmap ── */}
      {roadmapData && (
        <div className={styles['section']}>
          <div className={styles['roadmapSection']}>
            <div className={styles['roadmapTopRow']}>
              <div>
                <h2 className={styles['roadmapHeading']}>{t('progress.roadmap')}</h2>
                <p className={styles['roadmapSub']}>{t('progress.roadmapHint')}</p>
              </div>
              <div className={styles['roadmapRight']}>
                <div className={styles['totalBadge']}>{roadmapData.totalProgress}%</div>
                <div className={styles['totalLabel']}>{t('progress.complete')}</div>
                {roadmapData.projectedDate && (
                  <div className={styles['projectedDate']}>
                    {t('progress.projected')} {fmtDate(roadmapData.projectedDate)}
                  </div>
                )}
              </div>
            </div>

            <div className={styles['overallBarWrap']}>
              <div className={styles['overallBarTrack']}>
                <div className={styles['overallBarFill']}
                  style={{ width: `${roadmapData.totalProgress}%` }} />
              </div>
            </div>

            <SnakeTrack nodes={roadmapData.nodes} onNodeClick={setSelectedNode} />
          </div>
        </div>
      )}

      {/* ── Skill breakdown ── */}
      {currentNode && <SkillBreakdown node={currentNode} />}

      {/* ── Heatmap ── */}
      {dashData && <Heatmap recentActivity={dashData.recentActivity} />}

      {/* ── Ready banner ── */}
      {dashData?.progress.isReadyForTest && (
        <div className={styles['readyBanner']}>
          <Trophy size={18} className={styles['readyIco']} />
          <div>
            <strong>{t('progress.readyTitle')}</strong>
            <p>{t('progress.readyMsg', { level: dashData.currentLevel })}</p>
          </div>
          <button type="button" className={styles['readyBtn']}
            onClick={handleLevelUp} disabled={isLevelingUp}>
            {isLevelingUp ? t('dashboard.levelingUp') : `${t('progress.levelUp')} →`}
          </button>
        </div>
      )}

      {!dashData && !roadmapData && !dashLoading && !rmLoading && !anyErr && (
        <div className={styles['emptyState']}>
          <BarChart2 size={40} />
          <p>{t('progress.empty')}</p>
        </div>
      )}

      {/* ── Drawer ── */}
      {selectedNode && (
        <LevelDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onLevelUp={handleLevelUp}
          isLevelingUp={isLevelingUp}
        />
      )}
    </div>
  );
}