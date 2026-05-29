import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCheck,
    Layers,
    BookOpen,
    PenLine,
    Bookmark,
    Trash2,
    ArrowRight,
    RefreshCw,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
    fetchBookmarks,
    deleteBookmark,
    selectBookmarksList,
    selectBookmarksListStatus,
    selectBookmarksListError,
    selectDeleteStatus,
    selectBookmarksByType,
} from '@/store/Slices/BookMarksSlice';
import type { Bookmark as BookmarkItem, BookmarkType } from '@/types/bookmarks/Bookmarks.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './BookmarksPage.module.css';



interface TypeConfig {
    label: string;
    icon: typeof CheckCheck;
    color: string;
    route: string;
    routeLabel: string;
}

const TYPE_CONFIG: Record<BookmarkType, TypeConfig> = {
    GRAMMAR_RULE: {
        label: 'Grammar Rules',
        icon: CheckCheck,
        color: '#14b8a6',
        route: '/grammar',
        routeLabel: 'Go to Grammar',
    },
    VOCABULARY: {
        label: 'Vocabulary',
        icon: Layers,
        color: '#8b5cf6',
        route: '/vocabulary',
        routeLabel: 'Go to Vocabulary',
    },
    READING: {
        label: 'Reading',
        icon: BookOpen,
        color: '#22c55e',
        route: '/reading',
        routeLabel: 'Go to Reading',
    },
    WRITING_PROMPT: {
        label: 'Writing Prompts',
        icon: PenLine,
        color: '#ec4899',
        route: '/writing',
        routeLabel: 'Go to Writing',
    },
};

const TYPE_ORDER: BookmarkType[] = [
    'GRAMMAR_RULE',
    'VOCABULARY',
    'READING',
    'WRITING_PROMPT',
];



function EmptyState() {
    return (
        <div className={styles['emptyState']}>
            <div className={styles['emptyIcon']}>
                <Bookmark size={32} />
            </div>
            <h2 className={styles['emptyTitle']}>No bookmarks yet</h2>
            <p className={styles['emptySubtitle']}>
                While practicing, hit the bookmark icon on any exercise, word, or reading
                to save it here for later review.
            </p>
        </div>
    );
}

interface SectionProps {
    type: BookmarkType;
    items: BookmarkItem[];
    onDelete: (id: string) => void;
    deleteStatus: 'idle' | 'loading' | 'success' | 'error';
}

function BookmarkSection({ type, items, onDelete, deleteStatus }: SectionProps) {
    const navigate = useNavigate();
    const config = TYPE_CONFIG[type];
    const { icon: Icon, label, color, route, routeLabel } = config;

    if (items.length === 0) { return null; }

    return (
        <section className={styles['section']}>
            <div className={styles['sectionHeader']}>
                <div className={styles['sectionTitleRow']}>
                    <div
                        className={styles['sectionIcon']}
                        style={{ '--section-color': color } as React.CSSProperties}
                    >
                        <Icon size={16} />
                    </div>
                    <h2 className={styles['sectionTitle']}>{label}</h2>
                    <span className={styles['sectionCount']}>{items.length}</span>
                </div>
                <button
                    type="button"
                    className={styles['goToBtn']}
                    onClick={() => navigate(route)}
                >
                    {routeLabel}
                    <ArrowRight size={14} />
                </button>
            </div>

            <ul className={styles['itemList']}>
                {items.map((item) => (
                    <li key={item.id} className={styles['item']}>
                        <div className={styles['itemLeft']}>
                            <div
                                className={styles['itemDot']}
                                style={{ background: color }}
                            />
                            <div className={styles['itemMeta']}>
                                <span className={styles['itemId']}>
                                    ID: {item.targetId.slice(-8)}
                                </span>
                                <span className={styles['itemDate']}>
                                    Saved {formatDate(item.createdAt)}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className={styles['deleteBtn']}
                            onClick={() => onDelete(item.id)}
                            disabled={deleteStatus === 'loading'}
                            aria-label="Remove bookmark"
                        >
                            <Trash2 size={14} />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}



function formatDate(isoString: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
    }).format(new Date(isoString));
}



export function BookmarksPage() {
    const dispatch = useAppDispatch();
    const list = useAppSelector(selectBookmarksList);
    const listStatus = useAppSelector(selectBookmarksListStatus);
    const listError = useAppSelector(selectBookmarksListError);
    const deleteStatus = useAppSelector(selectDeleteStatus);

    const grammarItems = useAppSelector(selectBookmarksByType('GRAMMAR_RULE'));
    const vocabItems = useAppSelector(selectBookmarksByType('VOCABULARY'));
    const readingItems = useAppSelector(selectBookmarksByType('READING'));
    const writingItems = useAppSelector(selectBookmarksByType('WRITING_PROMPT'));

    const itemsByType: Record<BookmarkType, BookmarkItem[]> = {
        GRAMMAR_RULE: grammarItems,
        VOCABULARY: vocabItems,
        READING: readingItems,
        WRITING_PROMPT: writingItems,
    };

    useEffect(() => {
        if (listStatus === 'idle') {
            void dispatch(fetchBookmarks());
        }
    }, [listStatus, dispatch]);

    const handleDelete = useCallback((id: string) => {
        void dispatch(deleteBookmark(id));
    }, [dispatch]);

    const handleRetry = useCallback(() => {
        void dispatch(fetchBookmarks());
    }, [dispatch]);

    if (listStatus === 'loading' && list.length === 0) {
        return <FullPageSpinner label="Loading bookmarks…" />;
    }

    return (
        <div className={styles['page']}>
            <header className={styles['header']}>
                <div className={styles['headerIcon']}>
                    <Bookmark size={20} />
                </div>
                <div>
                    <h1 className={styles['title']}>Bookmarks</h1>
                    <p className={styles['subtitle']}>
                        {list.length > 0
                            ? `${list.length} saved item${list.length !== 1 ? 's' : ''}`
                            : 'Your saved exercises and words'}
                    </p>
                </div>
            </header>

            {listError !== null && (
                <div className={styles['errorBanner']}>
                    <span>{listError}</span>
                    <button type="button" onClick={handleRetry} className={styles['retryBtn']}>
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            )}

            {listStatus !== 'loading' && list.length === 0 && listError === null && (
                <EmptyState />
            )}

            {list.length > 0 && (
                <div className={styles['sections']}>
                    {TYPE_ORDER.map((type) => (
                        <BookmarkSection
                            key={type}
                            type={type}
                            items={itemsByType[type]}
                            onDelete={handleDelete}
                            deleteStatus={deleteStatus}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}