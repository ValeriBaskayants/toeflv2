import { cx } from '@/utils/cx';
import styles from './SpeakerOrb.module.css';

interface SpeakerOrbProps {
  active: boolean;
  color: string;
}

export function SpeakerOrb({ active, color }: SpeakerOrbProps) {
  return (
    <div className={cx(styles['orb'], active && styles['active'])} style={{ '--orb-color': color } as React.CSSProperties} aria-hidden="true">
      <span className={styles['ring']} />
      <span className={cx(styles['ring'], styles['ringLate'])} />
      <div className={styles['core']}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={styles['bar']} />
        ))}
      </div>
    </div>
  );
}