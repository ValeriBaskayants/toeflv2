import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { NOTES_MAX_LENGTH } from '@/constants/listening';
import { cx } from '@/utils/cx';
import styles from './NotesPanel.module.css';

interface NotesPanelProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export function NotesPanel({ open, value, onChange, onClose }: NotesPanelProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <aside className={cx(styles['panel'], open && styles['open'])} aria-hidden={!open} aria-label={t('listening.session.notesTitle')}>
      <header className={styles['head']}>
        <h2 className={styles['title']}>{t('listening.session.notesTitle')}</h2>
        <button type="button" className={styles['close']} onClick={onClose} aria-label={t('listening.session.close')}>
          <X size={16} />
        </button>
      </header>
      <textarea
        className={styles['textarea']}
        value={value}
        maxLength={NOTES_MAX_LENGTH}
        placeholder={t('listening.session.notesPlaceholder')}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={open ? 0 : -1}
      />
      <p className={styles['hint']}>{t('listening.session.notesHint')}</p>
    </aside>
  );
}