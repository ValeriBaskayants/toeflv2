import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import styles from './VolumeControl.module.css';

interface VolumeControlProps {
  volume: number;
  onChange: (volume: number) => void;
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current !== null && e.target instanceof Node && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const Icon = volume === 0 ? VolumeX : Volume2;

  return (
    <div className={styles['root']} ref={rootRef}>
      <button type="button" className={styles['btn']} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t('listening.session.volume')}>
        <Icon size={16} />
      </button>
      {open && (
        <div className={styles['popover']}>
          <input
            type="range" min={0} max={1} step={0.05} value={volume}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={t('listening.session.volume')} className={styles['slider']}
          />
        </div>
      )}
    </div>
  );
}