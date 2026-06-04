import { useState, useCallback } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { toggleBookmark, selectIsBookmarked } from '@/store/Slices/BookMarksSlice';
import type { BookmarkType } from '@/types/bookmarks/Bookmarks.types';
import styles from './Bookmarkbutton.module.css';

interface BookmarkButtonProps {
  targetId: string;
  type: BookmarkType;
  size?: 'sm' | 'md';
  label?: string;
}

export function BookmarkButton({ targetId, type, size = 'md', label }: BookmarkButtonProps) {
  const dispatch = useAppDispatch();
  const isInStore = useAppSelector(selectIsBookmarked(targetId, type));

  const [isPending, setIsPending] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const isBookmarked = optimistic ?? isInStore;

  const handleToggle = useCallback(async () => {
    if (isPending) {
      return;
    }

    const next = !isBookmarked;

    setOptimistic(next);
    setIsPending(true);

    const result = await dispatch(toggleBookmark({ targetId, type }));

    setIsPending(false);

    if (toggleBookmark.rejected.match(result)) {
      setOptimistic(null);
    } else {
      setOptimistic(null);
    }
  }, [isPending, isBookmarked, dispatch, targetId, type]);

  const iconSize = size === 'sm' ? 14 : 17;

  return (
    <button
      type="button"
      onClick={() => {
        void handleToggle();
      }}
      disabled={isPending}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'}
      aria-pressed={isBookmarked}
      className={[
        styles['btn'],
        styles[size],
        isBookmarked ? styles['active'] : '',
        isPending ? styles['pending'] : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles['iconWrap']}>
        {isBookmarked ? <BookmarkCheck size={iconSize} /> : <Bookmark size={iconSize} />}
      </span>
      {label !== undefined && (
        <span className={styles['label']}>{isBookmarked ? 'Saved' : label}</span>
      )}
    </button>
  );
}
