import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { LEVEL_COLOR } from '@/constants/level';
import type { RoadmapLevelSummary } from '@/types/roadmap/Roadmap.types';
import styles from './SnakeTrack.module.css';

interface SnakeNodeProps {
  lvl: RoadmapLevelSummary;
  readiness: number;
  onClick: (l: RoadmapLevelSummary) => void;
}

function SnakeNode({ lvl, readiness, onClick }: SnakeNodeProps) {
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
        <circle cx="30" cy="30" r={R} fill="none" stroke={color} strokeWidth="3.5" style={{ opacity: 0.15 }} />
        {!locked && (
          <circle
            cx="30" cy="30" r={R} fill="none" stroke={color}
            strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={off}
            transform="rotate(-90 30 30)"
            className={styles['nodeRingFill']}
          />
        )}
      </svg>
      <span className={styles['nodeBg']} style={!locked ? { background: `${color}18` } : undefined} />
      <span className={styles['nodeLbl']}>{lvl.displayName}</span>
      {lvl.status === 'completed' && <span className={styles['nodeChk']} style={{ color }}>✓</span>}
      {lvl.status === 'current' && <span className={styles['nodePulseRing']} style={{ background: color }} />}
      {lvl.status === 'locked' && (
        <span className={styles['nodeLockIco']}>
          <Lock size={9} />
        </span>
      )}
    </button>
  );
}

interface SnakeTrackProps {
  levels: RoadmapLevelSummary[];
  readiness: number;
  onNodeClick: (l: RoadmapLevelSummary) => void;
}

export function SnakeTrack({ levels, readiness, onNodeClick }: SnakeTrackProps) {
  const { t } = useTranslation();
  const row0 = levels.slice(0, 5);
  const row1 = [...levels.slice(5)].reverse();

  function Connector({ a, b }: { a: RoadmapLevelSummary; b: RoadmapLevelSummary }) {
    const filled = a.status === 'completed' && (b.status === 'completed' || b.status === 'current');
    return <div className={filled ? styles['connFilled'] : styles['conn']} />;
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
              <path
                d="M 96 4 C 96 50, 4 6, 4 50"
                fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="5 3.5"
              />
            </svg>
          </div>
          <Row row={row1} reversed />
        </>
      )}
      <div className={styles['snakeLegend']}>
        {([
          { key: 'completed', color: '#22c55e' },
          { key: 'current', color: '#6366f1' },
          { key: 'locked', color: 'var(--border)' },
        ] as const).map((s) => (
          <span key={s.key} className={styles['legItem']}>
            <span className={styles['legDot']} style={{ background: s.color }} />
            {t(`roadmap.status.${s.key}`)}
          </span>
        ))}
      </div>
    </div>
  );
}