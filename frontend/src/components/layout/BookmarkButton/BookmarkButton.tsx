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

export function BookmarkButton({
    targetId,
    type,
    size = 'md',
    label,
}: BookmarkButtonProps) {
    const dispatch = useAppDispatch();
    const isBookmarked = useAppSelector(selectIsBookmarked(targetId, type));
    const [isPending, setIsPending] = useState(false);

    const handleToggle = useCallback(async () => {
        if (isPending) { return; }
        setIsPending(true);
        await dispatch(toggleBookmark({ targetId, type }));
        setIsPending(false);
    }, [isPending, dispatch, targetId, type]);

    const iconSize = size === 'sm' ? 15 : 18;

    return (
        <button
            type="button"
            onClick={() => { void handleToggle(); }}
            disabled={isPending}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            aria-pressed={isBookmarked}
            className={[
                styles['btn'],
                styles[size],
                isBookmarked ? styles['active'] : '',
                isPending ? styles['pending'] : '',
            ].filter(Boolean).join(' ')}
        >
            {isBookmarked
                ? <BookmarkCheck size={iconSize} className={styles['icon']} />
                : <Bookmark size={iconSize} className={styles['icon']} />
            }
            {label !== undefined && (
                <span className={styles['label']}>
                    {isBookmarked ? 'Saved' : label}
                </span>
            )}
        </button>
    );
}