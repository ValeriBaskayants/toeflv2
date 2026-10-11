import { useEffect, useRef } from 'react';
import styles from './ExitDialog.module.css';

interface ExitDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitDialog({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: ExitDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={styles['overlay']} role="presentation" onClick={onCancel}>
      <div className={styles['dialog']} role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles['title']}>{title}</h2>
        <p className={styles['message']}>{message}</p>
        <div className={styles['actions']}>
          <button type="button" ref={cancelRef} className={styles['cancel']} onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={styles['confirm']} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}