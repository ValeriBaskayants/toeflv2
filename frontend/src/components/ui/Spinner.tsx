import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <div className={styles['wrapper']} role="status" aria-label={label ?? 'Loading'}>
      <div className={`${styles['ring']} ${styles[size]}`} />
      {label !== undefined && <span className={styles['label']}>{label}</span>}
    </div>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className={styles['fullPage']}>
      <Spinner size="lg" {...(label !== undefined && { label })} />
    </div>
  );
}