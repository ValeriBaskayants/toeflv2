import { useEffect, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    BookOpen, Clock, AlignLeft, Search, RefreshCw, ArrowRight,
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
import type { ReadingMaterial } from '@/types/reading/Reading.types';
import { getLevelColor, LEVEL_DISPLAY } from '@/constants/level';
import styles from './ReadingListPage.module.css';

const LEVELS = ['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'B2_PLUS', 'C1', 'C2'];

function ReadingCard({ item }: { item: ReadingMaterial }) {
    const navigate = useNavigate();
    const color = getLevelColor(item.level);

    const handleClick = useCallback(() => {
        navigate(`/reading/${item.slug}`);
    }, [navigate, item.slug]);

    return (
        <article
            className={styles['card']}
            style={{ '--card-accent': color } as React.CSSProperties}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
            aria-label={`Read: ${item.title}`}
        >
            <div className={styles['cardCover']} style={{ background: `linear-gradient(135deg, ${color}22, ${color}08)` }}>
                {item.coverImageUrl !== undefined ? (
                    <img src={item.coverImageUrl} alt="" className={styles['coverImg']} />
                ) : (
                    <div className={styles['coverFallback']}>
                        <BookOpen size={32} style={{ color, opacity: 0.4 }} />
                    </div>
                )}
                <span className={styles['levelBadge']} style={{ background: color }}>
                    {LEVEL_DISPLAY[item.level] ?? item.level}
                </span>
            </div>

            <div className={styles['cardBody']}>
                <span className={styles['topicTag']}>{item.topic}</span>
                <h2 className={styles['cardTitle']}>{item.title}</h2>
                {item.description !== undefined && (
                    <p className={styles['cardDesc']}>{item.description}</p>
                )}

                <div className={styles['cardFooter']}>
                    <div className={styles['cardMeta']}>
                        <span className={styles['metaItem']}>
                            <Clock size={12} />
                            {item.estimatedMinutes} min
                        </span>
                        <span className={styles['metaDot']} />
                        <span className={styles['metaItem']}>
                            <AlignLeft size={12} />
                            {item.wordCount} words
                        </span>
                    </div>
                    <div className={styles['cardArrow']} style={{ color }}>
                        <ArrowRight size={16} />
                    </div>
                </div>
            </div>

            <div className={styles['cardUnderline']} style={{ background: color }} />
        </article>
    );
}

export default function ReadingListPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const searchId = useId();

    const list = useAppSelector(selectFilteredList);
    const status = useAppSelector(selectReadingListStatus);
    const error = useAppSelector(selectReadingListError);
    const levelFilter = useAppSelector(selectLevelFilter);
    const topicSearch = useAppSelector(selectTopicSearch);

    useEffect(() => {
        if (status === 'idle') {
            void dispatch(fetchReadingList({}));
        }
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
            <header className={styles['pageHeader']}>
                <div>
                    <h1 className={styles['pageTitle']}>
                        {t('reading.title', 'Reading')}
                    </h1>
                    <p className={styles['pageSubtitle']}>
                        {t('reading.subtitle', 'Improve comprehension across all CEFR levels')}
                    </p>
                </div>
            </header>

            <div className={styles['filtersRow']}>
                <div className={styles['levelPills']} role="group" aria-label="Filter by level">
                    <button
                        type="button"
                        className={`${styles['pill']} ${levelFilter === '' ? styles['pillActive'] : ''}`}
                        onClick={() => handleLevelChange('')}
                    >
                        {t('reading.allLevels', 'All')}
                    </button>
                    {LEVELS.map((lvl) => (
                        <button
                            key={lvl}
                            type="button"
                            className={`${styles['pill']} ${levelFilter === lvl ? styles['pillActive'] : ''}`}
                            style={{
                                '--pill-color': getLevelColor(lvl),
                                ...(levelFilter === lvl ? { background: getLevelColor(lvl), borderColor: getLevelColor(lvl), color: '#fff' } : {}),
                            } as React.CSSProperties}
                            onClick={() => handleLevelChange(lvl)}
                        >
                            {LEVEL_DISPLAY[lvl]}
                        </button>
                    ))}
                </div>

                <div className={styles['searchWrap']}>
                    <Search className={styles['searchIcon']} size={14} />
                    <label htmlFor={searchId} className={styles['srOnly']}>Search by topic</label>
                    <input
                        id={searchId}
                        type="text"
                        className={styles['searchInput']}
                        value={topicSearch}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={t('reading.searchPlaceholder', 'Search by topic or title…')}
                    />
                </div>
            </div>

            {error !== null && (
                <div className={styles['errorBanner']}>
                    <span>{error}</span>
                    <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
                        <RefreshCw size={13} /> {t('reading.retry', 'Retry')}
                    </button>
                </div>
            )}

            {isLoading && (
                <div className={styles['grid']}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={styles['skeleton']} />
                    ))}
                </div>
            )}

            {!isLoading && list.length === 0 && error === null && (
                <div className={styles['empty']}>
                    <BookOpen size={40} />
                    <p>{t('reading.noResults', 'No readings found for this filter.')}</p>
                </div>
            )}

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