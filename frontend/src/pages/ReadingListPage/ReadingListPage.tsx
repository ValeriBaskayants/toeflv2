import { useEffect, useCallback, useId, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Clock, AlignLeft, Search,
  RefreshCw, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchReadingList,
  setLevelFilter,
  setTopicSearch,
  selectFilteredList,
  selectReadingListStatus,
  selectReadingListError,
  selectLevelFilter,
  selectTopicSearch,
} from '@/store/Slices/ReadingsSlice';
import { fetchBookmarks } from '@/store/Slices/BookMarksSlice';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';
import type { ReadingListItem, ReadingUserStatus } from '@/types/reading/Reading.types';
import { getLevelColor, LEVEL_DISPLAY } from '@/constants/level';
import styles from './ReadingListPage.module.css';

const LEVELS = [
  'A1', 'A1_PLUS', 'A2', 'A2_PLUS',
  'B1', 'B1_PLUS', 'B2', 'B2_PLUS',
  'C1', 'C2',
];

// ─── Status badge on list card ────────────────────────────────────────────────

const STATUS_STYLE: Record<ReadingUserStatus, { color: string; bg: string }> = {
  not_started: { color: '#64748b', bg: '#64748b14' },
  attempted:   { color: '#f59e0b', bg: '#f59e0b14' },
  completed:   { color: '#22c55e', bg: '#22c55e14' },
};

function UserStatusBadge({ status }: { status: ReadingUserStatus }) {
  const { t } = useTranslation('reading');
  const cfg = STATUS_STYLE[status];
  if (status === 'not_started') return null; // don't clutter new items
  return (
    <span
      className={styles['statusBadge']}
      style={{ '--s-color': cfg.color, '--s-bg': cfg.bg } as CSSProperties}
    >
      {status === 'completed' && <CheckCircle2 size={10} />}
      {t(`status.${status}`)}
    </span>
  );
}

// ─── Reading card ─────────────────────────────────────────────────────────────

function ReadingCard({ item }: { item: ReadingListItem }) {
  const { t }   = useTranslation('reading');
  const navigate = useNavigate();
  const color    = getLevelColor(item.level);

  const handleClick = useCallback(() => {
    navigate(`/reading/${item.slug}`);
  }, [navigate, item.slug]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleClick();
  }, [handleClick]);

  return (
    <article
      className={styles['card']}
      style={{ '--card-accent': color } as CSSProperties}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKey}
      aria-label={item.title}
    >
      {/* Cover */}
      <div
        className={styles['cardCover']}
        style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}
      >
        {item.coverImageUrl !== undefined ? (
          <img src={item.coverImageUrl} alt="" className={styles['coverImg']} loading="lazy" />
        ) : (
          <div className={styles['coverFallback']}>
            <BookOpen size={28} style={{ color, opacity: 0.35 }} />
          </div>
        )}
        <span className={styles['levelBadge']} style={{ background: color }}>
          {LEVEL_DISPLAY[item.level] ?? item.level}
        </span>
        {item.bestAccuracy !== null && (
          <span className={styles['accuracyBadge']}>
            {item.bestAccuracy}%
          </span>
        )}
      </div>

      {/* Body */}
      <div className={styles['cardBody']}>
        <div className={styles['cardBodyTop']}>
          <span className={styles['topicTag']} style={{ color }}>
            {item.topic}
          </span>
          <div className={styles['cardActions']}>
            <UserStatusBadge status={item.userStatus} />
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <BookmarkButton targetId={item.id} type={'READING' as never} size="sm" />
            </div>
          </div>
        </div>

        <h2 className={styles['cardTitle']}>{item.title}</h2>
        {item.description !== undefined && (
          <p className={styles['cardDesc']}>{item.description}</p>
        )}

        <div className={styles['cardFooter']}>
          <div className={styles['cardMeta']}>
            <span className={styles['metaItem']}>
              <Clock size={11} />
              {item.estimatedMinutes} {t('min')}
            </span>
            <span className={styles['metaDot']} />
            <span className={styles['metaItem']}>
              <AlignLeft size={11} />
              {item.wordCount} {t('words')}
            </span>
          </div>
          <ArrowRight size={15} className={styles['cardArrow']} style={{ color }} />
        </div>
      </div>

      <div className={styles['cardUnderline']} style={{ background: color }} />
    </article>
  );
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className={styles['grid']}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={styles['skeleton']} style={{ animationDelay: `${i * 0.07}s` }} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReadingListPage() {
  const { t }    = useTranslation('reading');
  const dispatch = useAppDispatch();
  const searchId = useId();

  const list        = useAppSelector(selectFilteredList);
  const status      = useAppSelector(selectReadingListStatus);
  const error       = useAppSelector(selectReadingListError);
  const levelFilter = useAppSelector(selectLevelFilter);
  const topicSearch = useAppSelector(selectTopicSearch);

  useEffect(() => {
    void dispatch(fetchBookmarks());
  }, [dispatch]);

  useEffect(() => {
    if (status === 'idle') void dispatch(fetchReadingList({}));
  }, [status, dispatch]);

  const handleLevelChange = useCallback((lvl: string) => {
    dispatch(setLevelFilter(lvl));
  }, [dispatch]);

  const handleSearch = useCallback((val: string) => {
    dispatch(setTopicSearch(val));
  }, [dispatch]);

  const handleRetry = useCallback(() => {
    void dispatch(fetchReadingList({}));
  }, [dispatch]);

  const isLoading = status === 'loading';

  return (
    <div className={styles['page']}>
      {/* Header */}
      <header className={styles['pageHeader']}>
        <div className={styles['pageIconWrap']}>
          <BookOpen size={20} />
        </div>
        <div>
          <h1 className={styles['pageTitle']}>{t('title')}</h1>
          <p className={styles['pageSubtitle']}>{t('subtitle')}</p>
        </div>
      </header>

      {/* Filters */}
      <div className={styles['filtersRow']}>
        <div className={styles['levelPills']} role="group" aria-label="Filter by level">
          <button
            type="button"
            className={`${styles['pill']} ${levelFilter === '' ? styles['pillActive'] : ''}`}
            onClick={() => handleLevelChange('')}
          >
            {t('allLevels')}
          </button>
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`${styles['pill']} ${levelFilter === lvl ? styles['pillActive'] : ''}`}
              style={
                levelFilter === lvl
                  ? { background: getLevelColor(lvl), borderColor: getLevelColor(lvl), color: '#fff' } as CSSProperties
                  : ({ '--pill-color': getLevelColor(lvl) } as CSSProperties)
              }
              onClick={() => handleLevelChange(lvl)}
            >
              {LEVEL_DISPLAY[lvl]}
            </button>
          ))}
        </div>

        <div className={styles['searchWrap']}>
          <Search className={styles['searchIcon']} size={14} />
          <label htmlFor={searchId} className={styles['srOnly']}>
            {t('searchPlaceholder')}
          </label>
          <input
            id={searchId}
            type="search"
            className={styles['searchInput']}
            value={topicSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
          />
        </div>
      </div>

      {/* Error */}
      {error !== null && (
        <div className={styles['errorBanner']}>
          <span>{t('error')}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={13} /> {t('retry')}
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && <SkeletonGrid />}

      {/* Empty */}
      {!isLoading && list.length === 0 && error === null && (
        <div className={styles['empty']}>
          <BookOpen size={40} />
          <p>
            {topicSearch.length > 0
              ? t('noResultsSearch', { query: topicSearch })
              : t('noResults')}
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && list.length > 0 && (
        <div className={styles['grid']}>
          {list.map((item) => (
            <ReadingCard item={item} key={item.id} />
          ))}
        </div>
      )}
    </div>
  );
}