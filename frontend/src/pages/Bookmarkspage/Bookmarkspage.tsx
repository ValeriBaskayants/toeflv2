import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck, Layers, BookOpen, PenLine,
  Bookmark, Trash2, ArrowUpRight, RefreshCw,
  Clock, Frown, AudioLines,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchBookmarks,
  deleteBookmark,
  selectBookmarksList,
  selectBookmarksListStatus,
  selectBookmarksListError,
  selectDeleteStatus,
} from '@/store/Slices/BookMarksSlice';
import type { Bookmark as BookmarkItem, BookmarkType } from '@/types/bookmarks/Bookmarks.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './Bookmarkspage .module.css';

// ─── Config ────────────────────────────────────────────────────────────────────

interface TypeConfig {
  label:       string;
  description: string;
  icon:        typeof CheckCheck;
  color:       string;
  route:       string;
}

const TYPE_CONFIG: Record<BookmarkType, TypeConfig> = {
  GRAMMAR_RULE: {
    label:       'Grammar Rule',
    description: 'Saved grammar pattern',
    icon:        CheckCheck,
    color:       '#14b8a6',
    route:       '/grammar',
  },
  VOCABULARY: {
    label:       'Vocabulary Word',
    description: 'Saved word to review',
    icon:        Layers,
    color:       '#8b5cf6',
    route:       '/vocabulary',
  },
  READING: {
    label:       'Reading Passage',
    description: 'Saved reading exercise',
    icon:        BookOpen,
    color:       '#22c55e',
    route:       '/reading',
  },
  WRITING_PROMPT: {
    label:       'Writing Prompt',
    description: 'Saved writing task',
    icon:        PenLine,
    color:       '#ec4899',
    route:       '/writing',
  },
  LISTENING: {
    label:       'Listening Exercise',
    description: 'Saved audio exercise',
    icon:        AudioLines,
    color:       '#f59e0b',
    route:       '/listening',
  },
};

const TYPE_ORDER: BookmarkType[] = [
  'GRAMMAR_RULE',
  'VOCABULARY',
  'READING',
  'WRITING_PROMPT',
  'LISTENING',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60)     { return 'just now'; }
  if (seconds < 3600)   { return `${Math.floor(seconds / 60)}m ago`; }
  if (seconds < 86400)  { return `${Math.floor(seconds / 3600)}h ago`; }
  if (seconds < 604800) { return `${Math.floor(seconds / 86400)}d ago`; }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day:   'numeric',
  }).format(new Date(isoString));
}

// ─── BookmarkCard ──────────────────────────────────────────────────────────────

interface CardProps {
  item:         BookmarkItem;
  onDelete:     (id: string) => void;
  deleteStatus: string;
}

function BookmarkCard({ item, onDelete, deleteStatus }: CardProps) {
  const navigate = useNavigate();
  const config   = TYPE_CONFIG[item.type];
  const { label, description, icon: Icon, color, route } = config;

  return (
    <article
      className={styles['card']}
      style={{ '--card-color': color } as React.CSSProperties}
    >
      {/* Left accent line */}
      <div className={styles['cardAccent']} />

      {/* Icon */}
      <div className={styles['cardIcon']}>
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className={styles['cardContent']}>
        <span className={styles['cardType']}>{label}</span>
        <span className={styles['cardDesc']}>{description}</span>
        <span className={styles['cardTime']}>
          <Clock size={11} />
          {timeAgo(item.createdAt)}
        </span>
      </div>

      {/* Actions */}
      <div className={styles['cardActions']}>
        <button
          type="button"
          className={styles['openBtn']}
          onClick={() => navigate(route)}
          title={`Go to ${label}`}
        >
          <ArrowUpRight size={15} />
        </button>
        <button
          type="button"
          className={styles['deleteBtn']}
          onClick={() => onDelete(item.id)}
          disabled={deleteStatus === 'loading'}
          title="Remove bookmark"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

// ─── Group ─────────────────────────────────────────────────────────────────────

interface GroupProps {
  type:         BookmarkType;
  items:        BookmarkItem[];
  onDelete:     (id: string) => void;
  deleteStatus: string;
}

function BookmarkGroup({ type, items, onDelete, deleteStatus }: GroupProps) {
  const navigate = useNavigate();
  const config   = TYPE_CONFIG[type];
  const { label, icon: Icon, color, route } = config;

  if (items.length === 0) { return null; }

  return (
    <section className={styles['group']}>
      {/* Group header */}
      <div className={styles['groupHeader']}>
        <div
          className={styles['groupIcon']}
          style={{ '--section-color': color } as React.CSSProperties}
        >
          <Icon size={15} />
        </div>
        <h2 className={styles['groupTitle']}>{label}s</h2>
        <span className={styles['groupCount']}>{items.length}</span>
        <button
          type="button"
          className={styles['groupLink']}
          onClick={() => navigate(route)}
        >
          Practice all
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* Cards */}
      <div className={styles['cardList']}>
        {items.map((item) => (
          <BookmarkCard
            key={item.id}
            item={item}
            onDelete={onDelete}
            deleteStatus={deleteStatus}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Empty ─────────────────────────────────────────────────────────────────────

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className={styles['emptyState']}>
      <div className={styles['emptyIllustration']}>
        <Bookmark size={36} />
      </div>
      <h2 className={styles['emptyTitle']}>Nothing saved yet</h2>
      <p className={styles['emptyText']}>
        While practicing grammar, vocabulary, reading, writing, or listening — tap{' '}
        <span className={styles['emptyHighlight']}>
          <Bookmark size={12} /> Save
        </span>{' '}
        on any exercise to keep it here for later review.
      </p>
      <div className={styles['emptySuggestions']}>
        {TYPE_ORDER.map((type) => {
          const { label, icon: Icon, color, route } = TYPE_CONFIG[type];
          return (
            <button
              key={type}
              type="button"
              className={styles['emptySuggestionBtn']}
              style={{ '--btn-color': color } as React.CSSProperties}
              onClick={() => navigate(route)}
            >
              <Icon size={14} />
              {label}s
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function BookmarksPage() {
  const dispatch     = useAppDispatch();
  const list         = useAppSelector(selectBookmarksList);
  const listStatus   = useAppSelector(selectBookmarksListStatus);
  const listError    = useAppSelector(selectBookmarksListError);
  const deleteStatus = useAppSelector(selectDeleteStatus);

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

  // Group items by type
  const grouped = TYPE_ORDER.reduce<Record<BookmarkType, BookmarkItem[]>>(
    (acc, type) => {
      acc[type] = list.filter((b) => b.type === type);
      return acc;
    },
    {} as Record<BookmarkType, BookmarkItem[]>,
  );

  const totalCount = list.length;

  return (
    <div className={styles['page']}>

      {/* Header */}
      <header className={styles['header']}>
        <div className={styles['headerLeft']}>
          <div className={styles['headerIcon']}>
            <Bookmark size={20} />
          </div>
          <div>
            <h1 className={styles['title']}>Saved Items</h1>
            <p className={styles['subtitle']}>
              {totalCount > 0
                ? `${totalCount} item${totalCount !== 1 ? 's' : ''} across ${
                    TYPE_ORDER.filter((t) => grouped[t].length > 0).length
                  } section${TYPE_ORDER.filter((t) => grouped[t].length > 0).length !== 1 ? 's' : ''}`
                : 'Items you save while practicing appear here'}
            </p>
          </div>
        </div>
      </header>

      {/* Error */}
      {listError !== null && (
        <div className={styles['errorBanner']}>
          <Frown size={16} />
          <span>{listError}</span>
          <button type="button" onClick={handleRetry} className={styles['retryBtn']}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Content */}
      {list.length === 0 && listStatus !== 'loading' && listError === null
        ? <EmptyState />
        : (
          <div className={styles['groups']}>
            {TYPE_ORDER.map((type) => (
              <BookmarkGroup
                key={type}
                type={type}
                items={grouped[type]}
                onDelete={handleDelete}
                deleteStatus={deleteStatus}
              />
            ))}
          </div>
        )
      }
    </div>
  );
}