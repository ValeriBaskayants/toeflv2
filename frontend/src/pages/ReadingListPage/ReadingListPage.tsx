import { useEffect, useState, useId, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Clock, AlignLeft, Search, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchReadingList, setLevelFilter, setTopicSearch, selectFilteredList,
  selectReadingListStatus, selectReadingListError, selectLevelFilter, selectTopicSearch
} from '@/store/Slices/ReadingsSlice';
import { fetchBookmarks } from '@/store/Slices/BookMarksSlice';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';
import type { ReadingListItem, ReadingUserStatus } from '@/types/reading/Reading.types';
import { getLevelConfig, LEVEL_CONFIG, STATUS_CONFIG } from '@/constants/reading-meta';
import styles from './ReadingListPage.module.css';


const LEVELS = Object.keys(LEVEL_CONFIG);

function UserStatusBadge({ status }: { status: ReadingUserStatus }) {
  const { t } = useTranslation('reading');
  if (status === 'not_started') return null; 
  
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={styles['statusBadge']} style={{ '--s-color': cfg.color, '--s-bg': cfg.bg } as CSSProperties}>
      {status === 'completed' && <CheckCircle2 size={12} strokeWidth={2.5} />}
      {t(`status.${cfg.labelKey}`)}
    </span>
  );
}

function ReadingCard({ item }: { item: ReadingListItem }) {
  const { t } = useTranslation('reading');
  const { color, label } = getLevelConfig(item.level);

  return (
    
    <Link 
      to={`/reading/${item.slug}`} 
      className={styles['card']}
      style={{ '--card-accent': color } as CSSProperties}
      aria-label={item.title}
    >
      <div className={styles['cardCover']} style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}>
        {item.coverImageUrl ? (
          <img src={item.coverImageUrl} alt="" className={styles['coverImg']} loading="lazy" />
        ) : (
          <div className={styles['coverFallback']}>
            <BookOpen size={32} style={{ color, opacity: 0.2 }} />
          </div>
        )}
        <span className={styles['levelBadge']} style={{ background: color }}>{label}</span>
        {item.bestAccuracy !== null && (
          <span className={styles['accuracyBadge']}>{item.bestAccuracy}%</span>
        )}
      </div>

      <div className={styles['cardBody']}>
        <div className={styles['cardBodyTop']}>
          <span className={styles['topicTag']} style={{ color }}>{item.topic}</span>
          <div className={styles['cardActions']} onClick={(e) => e.preventDefault()}>
            <UserStatusBadge status={item.userStatus} />
            <BookmarkButton targetId={item.id} type="READING" size="sm" />
          </div>
        </div>

        <h2 className={styles['cardTitle']}>{item.title}</h2>
        {item.description && <p className={styles['cardDesc']}>{item.description}</p>}

        <div className={styles['cardFooter']}>
          <div className={styles['cardMeta']}>
            <span className={styles['metaItem']}><Clock size={14} />{item.estimatedMinutes} {t('min')}</span>
            <span className={styles['metaDot']} />
            <span className={styles['metaItem']}><AlignLeft size={14} />{item.wordCount} {t('words')}</span>
          </div>
          <ArrowRight size={18} className={styles['cardArrow']} style={{ color }} />
        </div>
      </div>
      <div className={styles['cardUnderline']} style={{ background: color }} />
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className={styles['grid']}>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={styles['skeleton']} style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

export default function ReadingListPage() {
  const { t } = useTranslation('reading');
  const dispatch = useAppDispatch();
  const searchId = useId();

  const list = useAppSelector(selectFilteredList);
  const status = useAppSelector(selectReadingListStatus);
  const error = useAppSelector(selectReadingListError);
  const levelFilter = useAppSelector(selectLevelFilter);
  const globalTopicSearch = useAppSelector(selectTopicSearch);

  
  const [localSearch, setLocalSearch] = useState(globalTopicSearch);

  useEffect(() => { void dispatch(fetchBookmarks()); }, [dispatch]);
  useEffect(() => { if (status === 'idle') void dispatch(fetchReadingList({})); }, [status, dispatch]);

  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== globalTopicSearch) dispatch(setTopicSearch(localSearch));
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, globalTopicSearch, dispatch]);

  const isLoading = status === 'loading';

  return (
    <div className={styles['page']}>
      <header className={styles['pageHeader']}>
        <div className={styles['pageIconWrap']}><BookOpen size={24} strokeWidth={1.5} /></div>
        <div>
          <h1 className={styles['pageTitle']}>{t('title')}</h1>
          <p className={styles['pageSubtitle']}>{t('subtitle')}</p>
        </div>
      </header>

      <div className={styles['filtersRow']}>
        <div className={styles['levelPills']} role="group">
          <button
            type="button"
            className={`${styles['pill']} ${levelFilter === '' ? styles['pillActive'] : ''}`}
            onClick={() => dispatch(setLevelFilter(''))}
          >
            {t('allLevels')}
          </button>
          {LEVELS.map((lvl) => {
            const { color, label } = getLevelConfig(lvl);
            return (
              <button
                key={lvl}
                type="button"
                className={`${styles['pill']} ${levelFilter === lvl ? styles['pillActive'] : ''}`}
                style={levelFilter === lvl 
                  ? { background: color, borderColor: color, color: '#fff' } as CSSProperties 
                  : { '--pill-color': color } as CSSProperties
                }
                onClick={() => dispatch(setLevelFilter(lvl))}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className={styles['searchWrap']}>
          <Search className={styles['searchIcon']} size={16} />
          <input
            id={searchId}
            type="search"
            className={styles['searchInput']}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
          />
        </div>
      </div>

      {error && (
        <div className={styles['errorBanner']}>
          <span>{t('error')}</span>
          <button type="button" className={styles['retryBtn']} onClick={() => dispatch(fetchReadingList({}))}>
            <RefreshCw size={14} /> {t('retry')}
          </button>
        </div>
      )}

      {isLoading && <SkeletonGrid />}

      {!isLoading && list.length === 0 && !error && (
        <div className={styles['empty']}>
          <BookOpen size={48} strokeWidth={1} />
          <p>{localSearch ? t('noResultsSearch', { query: localSearch }) : t('noResults')}</p>
        </div>
      )}

      {!isLoading && list.length > 0 && (
        <div className={styles['grid']}>
          {list.map((item) => <ReadingCard item={item} key={item.id} />)}
        </div>
      )}
    </div>
  );
}