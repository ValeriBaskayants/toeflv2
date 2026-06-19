import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  Layers,
  BookOpen,
  PenLine,
  Bookmark,
  Trash2,
  ArrowUpRight,
  RefreshCw,
  Frown,
  AudioLines,
  TrendingUp,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchBookmarks,
  deleteBookmark,
  optimisticRemove,
  setActiveFilter,
  selectBookmarksList,
  selectFilteredBookmarks,
  selectBookmarksListStatus,
  selectBookmarksListError,
  selectDeletingId,
  selectActiveFilter,
  selectCountByType,
} from '@/store/Slices/BookMarksSlice';
import type {
  EnrichedBookmark,
  BookmarkType,
  BookmarksFilterType,
} from '@/types/bookmarks/Bookmarks.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './Bookmarkspage.module.css';



interface TypeConfig {
  label: string;
  plural: string;
  icon: typeof CheckCheck;
  color: string;
  route: string;
}

const TYPE_CONFIG: Record<BookmarkType, TypeConfig> = {
  GRAMMAR_RULE: {
    label: 'Grammar',
    plural: 'Grammar rules',
    icon: CheckCheck,
    color: '#14b8a6',
    route: '/grammar',
  },
  VOCABULARY: {
    label: 'Vocabulary',
    plural: 'Vocabulary',
    icon: Layers,
    color: '#8b5cf6',
    route: '/vocabulary',
  },
  READING: {
    label: 'Reading',
    plural: 'Reading passages',
    icon: BookOpen,
    color: '#22c55e',
    route: '/reading',
  },
  WRITING_PROMPT: {
    label: 'Writing',
    plural: 'Writing prompts',
    icon: PenLine,
    color: '#ec4899',
    route: '/writing',
  },
  LISTENING: {
    label: 'Listening',
    plural: 'Listening',
    icon: AudioLines,
    color: '#f59e0b',
    route: '/listening',
  },
};

const TYPE_ORDER: BookmarkType[] = [
  'GRAMMAR_RULE',
  'VOCABULARY',
  'READING',
  'WRITING_PROMPT',
  'LISTENING',
];



function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(isoString),
  );
}

function itemRoute(item: EnrichedBookmark): string {
  const base = TYPE_CONFIG[item.type].route;
  return item.data?.slug ? `${base}/${item.data.slug}` : base;
}

function levelBadgeStyle(level?: string): React.CSSProperties {
  if (!level) return {};
  if (level.startsWith('A')) return { color: '#22c55e', borderColor: 'rgba(34,197,94,.25)' };
  if (level.startsWith('B')) return { color: '#f59e0b', borderColor: 'rgba(245,158,11,.25)' };
  return { color: '#8b5cf6', borderColor: 'rgba(139,92,246,.25)' };
}



interface StatBarProps {
  total: number;
  counts: Record<BookmarkType, number>;
}

function StatBar({ total, counts }: StatBarProps) {
  if (total === 0) return null;
  const activeTypes = TYPE_ORDER.filter((t) => counts[t] > 0);

  return (
    <div className={styles['stats']}>
      <div className={styles['statCard']}>
        <TrendingUp size={14} className={styles['statIcon']} />
        <span className={styles['statNum']}>{total}</span>
        <span className={styles['statLabel']}>Total saved</span>
      </div>
      {activeTypes.map((type) => {
        const cfg = TYPE_CONFIG[type];
        const Icon = cfg.icon;
        return (
          <div key={type} className={styles['statCard']}>
            <Icon
              size={14}
              className={styles['statIcon']}
              style={{ color: cfg.color } as React.CSSProperties}
            />
            <span className={styles['statNum']} style={{ color: cfg.color }}>
              {counts[type]}
            </span>
            <span className={styles['statLabel']}>{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}



interface FilterTabsProps {
  active: BookmarksFilterType;
  counts: Record<BookmarkType, number>;
  total: number;
  onChange: (f: BookmarksFilterType) => void;
}

function FilterTabs({ active, counts, total, onChange }: FilterTabsProps) {
  const hasAny = TYPE_ORDER.some((t) => counts[t] > 0);
  if (!hasAny) return null;

  return (
    <div className={styles['filters']} role="tablist" aria-label="Filter bookmarks by type">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'ALL'}
        className={`${styles['filterTab']} ${active === 'ALL' ? styles['filterTabActive'] : ''}`}
        onClick={() => onChange('ALL')}
      >
        <Bookmark size={13} />
        All
        <span className={styles['filterCount']}>{total}</span>
      </button>

      {TYPE_ORDER.filter((t) => counts[t] > 0).map((type) => {
        const cfg = TYPE_CONFIG[type];
        const Icon = cfg.icon;
        const isActive = active === type;
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles['filterTab']} ${isActive ? styles['filterTabActive'] : ''}`}
            style={
              isActive
                ? ({ '--tab-color': cfg.color } as React.CSSProperties)
                : undefined
            }
            onClick={() => onChange(type)}
          >
            <Icon size={13} />
            {cfg.label}
            <span className={styles['filterCount']}>{counts[type]}</span>
          </button>
        );
      })}
    </div>
  );
}



interface CardProps {
  item: EnrichedBookmark;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

function BookmarkCard({ item, isDeleting, onDelete }: CardProps) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[item.type];
  const { icon: Icon, color, label } = cfg;
  const cardRef = useRef<HTMLElement>(null);

  const title = item.data?.title ?? label;
  const level = item.data?.level;
  const topic = item.data?.topic;

  function handleDelete() {
    const el = cardRef.current;
    if (el !== null) {
      el.style.transition = 'opacity .18s ease, transform .18s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(10px)';
    }
    
    setTimeout(() => onDelete(item.id), 170);
  }

  return (
    <article
      ref={cardRef}
      className={styles['card']}
      style={{ '--card-color': color } as React.CSSProperties}
      aria-label={`${label}: ${title}`}
    >
      <div className={styles['cardStripe']} aria-hidden="true" />

      <div className={styles['cardIcon']} aria-hidden="true">
        <Icon size={17} />
      </div>

      <div className={styles['cardBody']}>
        <p className={styles['cardTitle']} title={title}>
          {title}
        </p>
        <div className={styles['cardMeta']}>
          {level !== undefined && (
            <span className={styles['levelBadge']} style={levelBadgeStyle(level)}>
              {level}
            </span>
          )}
          {topic !== undefined && topic !== '' && (
            <span className={styles['topicBadge']}>{topic}</span>
          )}
          <span className={styles['cardTime']}>{timeAgo(item.createdAt)}</span>
        </div>
      </div>

      <div className={styles['cardActions']}>
        <button
          type="button"
          className={styles['openBtn']}
          onClick={() => navigate(itemRoute(item))}
          title={`Open ${label}`}
          aria-label={`Open ${title}`}
        >
          <ArrowUpRight size={14} />
        </button>
        <button
          type="button"
          className={styles['deleteBtn']}
          onClick={handleDelete}
          disabled={isDeleting}
          title="Remove bookmark"
          aria-label={`Remove ${title} from bookmarks`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </article>
  );
}



interface GroupProps {
  type: BookmarkType;
  items: EnrichedBookmark[];
  deletingId: string | null;
  onDelete: (id: string) => void;
}

function BookmarkGroup({ type, items, deletingId, onDelete }: GroupProps) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[type];
  const { plural, icon: Icon, color, route } = cfg;

  if (items.length === 0) return null;

  return (
    <section className={styles['group']}>
      <div className={styles['groupHeader']}>
        <div
          className={styles['groupDot']}
          style={{ background: color }}
          aria-hidden="true"
        />
        <h2 className={styles['groupTitle']}>{plural}</h2>
        <span className={styles['groupCount']}>{items.length}</span>
        <button
          type="button"
          className={styles['groupLink']}
          onClick={() => navigate(route)}
          aria-label={`Practice all ${plural}`}
        >
          <Icon size={12} aria-hidden="true" />
          Practice all
          <ArrowUpRight size={12} aria-hidden="true" />
        </button>
      </div>

      <div className={styles['cardList']}>
        {items.map((item) => (
          <BookmarkCard
            key={item.id}
            item={item}
            isDeleting={deletingId === item.id}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}



interface EmptyStateProps {
  filtered: boolean;
  filterType?: BookmarkType;
  onClearFilter: () => void;
}

function EmptyState({ filtered, filterType, onClearFilter }: EmptyStateProps) {
  const navigate = useNavigate();

  if (filtered && filterType !== undefined) {
    const cfg = TYPE_CONFIG[filterType];
    const Icon = cfg.icon;
    return (
      <div className={styles['emptyState']}>
        <div className={styles['emptyIllustration']}>
          <Icon size={32} />
        </div>
        <h2 className={styles['emptyTitle']}>No {cfg.plural.toLowerCase()} saved</h2>
        <p className={styles['emptyText']}>
          While practicing {cfg.label.toLowerCase()}, tap the bookmark icon to save items here.
        </p>
        <div className={styles['emptyActions']}>
          <button
            type="button"
            className={styles['emptyPrimaryBtn']}
            style={{ '--btn-color': cfg.color } as React.CSSProperties}
            onClick={() => navigate(cfg.route)}
          >
            <Icon size={14} />
            Go to {cfg.label}
          </button>
          <button type="button" className={styles['emptyClearBtn']} onClick={onClearFilter}>
            Show all saved items
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['emptyState']}>
      <div className={styles['emptyIllustration']}>
        <Bookmark size={32} />
      </div>
      <h2 className={styles['emptyTitle']}>Nothing saved yet</h2>
      <p className={styles['emptyText']}>
        While practicing, tap{' '}
        <span className={styles['inlineBookmark']}>
          <Bookmark size={11} /> Save
        </span>{' '}
        on any exercise to keep it here for later review.
      </p>
      <div className={styles['emptyChips']}>
        {TYPE_ORDER.map((type) => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              type="button"
              className={styles['chip']}
              style={{ '--chip-color': cfg.color } as React.CSSProperties}
              onClick={() => navigate(cfg.route)}
            >
              <Icon size={13} />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}



export function BookmarksPage() {
  const dispatch = useAppDispatch();

  const list = useAppSelector(selectBookmarksList);
  const filtered = useAppSelector(selectFilteredBookmarks);
  const listStatus = useAppSelector(selectBookmarksListStatus);
  const listError = useAppSelector(selectBookmarksListError);
  const deletingId = useAppSelector(selectDeletingId);
  const activeFilter = useAppSelector(selectActiveFilter);
  const counts = useAppSelector(selectCountByType);

  
  useEffect(() => {
    if (listStatus === 'idle') {
      void dispatch(fetchBookmarks(undefined));
    }
  }, [listStatus, dispatch]);

  const handleDelete = useCallback(
    (id: string) => {
      
      dispatch(optimisticRemove(id));
      void dispatch(deleteBookmark(id));
    },
    [dispatch],
  );

  const handleRetry = useCallback(() => {
    void dispatch(fetchBookmarks(undefined));
  }, [dispatch]);

  const handleFilterChange = useCallback(
    (f: BookmarksFilterType) => {
      dispatch(setActiveFilter(f));
    },
    [dispatch],
  );

  if (listStatus === 'loading' && list.length === 0) {
    return <FullPageSpinner label="Loading saved items…" />;
  }

  
  const grouped = TYPE_ORDER.reduce<Record<BookmarkType, EnrichedBookmark[]>>(
    (acc, type) => {
      acc[type] = filtered.filter((b) => b.type === type);
      return acc;
    },
    {} as Record<BookmarkType, EnrichedBookmark[]>,
  );

  const total = list.length;
  const activeSections = TYPE_ORDER.filter((t) => grouped[t].length > 0).length;

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <div className={styles['headerLeft']}>
          <div className={styles['headerIcon']} aria-hidden="true">
            <Bookmark size={20} />
          </div>
          <div>
            <h1 className={styles['title']}>Saved items</h1>
            <p className={styles['subtitle']}>
              {total > 0
                ? `${total} item${total !== 1 ? 's' : ''} across ${activeSections} section${activeSections !== 1 ? 's' : ''}`
                : 'Items you save while practicing appear here'}
            </p>
          </div>
        </div>
      </header>

      {listError !== null && (
        <div className={styles['errorBanner']} role="alert">
          <Frown size={15} aria-hidden="true" />
          <span>{listError}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={12} aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      <StatBar total={total} counts={counts} />

      <FilterTabs
        active={activeFilter}
        counts={counts}
        total={total}
        onChange={handleFilterChange}
      />

      {filtered.length === 0 && listStatus !== 'loading' ? (
        activeFilter !== 'ALL' ? (
          <EmptyState
            filtered
            filterType={activeFilter}
            onClearFilter={() => handleFilterChange('ALL')}
          />
        ) : (
          <EmptyState filtered={false} onClearFilter={() => handleFilterChange('ALL')} />
        )
      ) : (
        <div className={styles['groups']}>
          {TYPE_ORDER.map((type) => (
            <BookmarkGroup
              key={type}
              type={type}
              items={grouped[type]}
              deletingId={deletingId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}