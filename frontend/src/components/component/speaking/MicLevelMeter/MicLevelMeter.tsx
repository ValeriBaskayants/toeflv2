import styles from './MicLevelMeter.module.css';

interface MicLevelMeterProps {
  level: number;
  barCount?: number;
}

const DEFAULT_BAR_COUNT = 5;

export function MicLevelMeter({ level, barCount = DEFAULT_BAR_COUNT }: MicLevelMeterProps) {
  const activeBars = Math.round(level * barCount);

  return (
    <div className={styles['meter']} aria-hidden="true">
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className={`${styles['bar']} ${i < activeBars ? styles['barActive'] : ''}`}
          style={{ '--bar-index': i } as React.CSSProperties}
        />
      ))}
    </div>
  );
}