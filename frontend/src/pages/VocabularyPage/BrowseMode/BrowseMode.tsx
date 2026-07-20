import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X, BookOpen } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { fetchWordList, selectWordList, selectWordListStatus } from '@/store/Slices/VocabularySlice';
import { PartOfSpeech } from '@/types/globalTypes';
import type { Level } from '@/types/globalTypes';
import { LEVEL_ORDER, LEVEL_DISPLAY, LEVEL_COLOR } from '../shared/Badges';
import { WordCard } from './WordCard';
import styles from './BrowseMode.module.css';
import type { CSSProperties } from 'react';

export function BrowseMode() {
    const { t } = useTranslation('vocabulary');
    const dispatch = useAppDispatch();
    const wordList = useAppSelector(selectWordList);
    const wordListStatus = useAppSelector(selectWordListStatus);

    const [search, setSearch] = useState('');
    const [level, setLevel] = useState<Level | null>(null);
    const [pos, setPos] = useState<PartOfSpeech | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const params = {
            limit: 100,
            ...(level !== null ? { level } : {}),
            ...(pos !== null ? { type: pos } : {}),
            ...(search.trim().length > 0 ? { search: search.trim() } : {}),
        };
        void dispatch(fetchWordList(params));
    }, [dispatch, level, pos, search]);

    const activeFilterCount = [level, pos].filter(Boolean).length;

    return (
        <div className={styles['browseWrap']}>
            <div className={styles['browseToolbar']}>
                <div className={styles['searchWrap']}>
                    <Search size={15} className={styles['searchIcon']} />
                    <input
                        ref={searchRef}
                        type="search"
                        className={styles['searchInput']}
                        placeholder={t('browse.search')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label={t('browse.search')}
                    />
                    {search.length > 0 && (
                        <button
                            type="button"
                            className={styles['searchClearBtn']}
                            onClick={() => {
                                setSearch('');
                                searchRef.current?.focus();
                            }}
                            aria-label={t('browse.clearSearch')}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className={`${styles['filterToggle']} ${showFilters || activeFilterCount > 0 ? styles['filterToggleActive'] : ''}`}
                    onClick={() => setShowFilters((p) => !p)}
                    aria-expanded={showFilters}
                >
                    <Filter size={14} />
                    {t('browse.filters')}
                    {activeFilterCount > 0 && <span className={styles['filterCount']}>{activeFilterCount}</span>}
                </button>
            </div>

            {showFilters && (
                <div className={styles['filterPanel']}>
                    <div className={styles['filterGroup']}>
                        <span className={styles['filterLabel']}>{t('browse.level')}</span>
                        <div className={styles['filterPills']}>
                            <button
                                type="button"
                                className={`${styles['filterPill']} ${level === null ? styles['filterPillActive'] : ''}`}
                                onClick={() => setLevel(null)}
                            >
                                {t('browse.all')}
                            </button>
                            {LEVEL_ORDER.map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    className={`${styles['filterPill']} ${level === l ? styles['filterPillActive'] : ''}`}
                                    style={level === l ? ({ '--pill-color': LEVEL_COLOR[l] } as CSSProperties) : undefined}
                                    onClick={() => setLevel(level === l ? null : l)}
                                >
                                    {LEVEL_DISPLAY[l]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles['filterGroup']}>
                        <span className={styles['filterLabel']}>{t('browse.partOfSpeech')}</span>
                        <div className={styles['filterPills']}>
                            <button
                                type="button"
                                className={`${styles['filterPill']} ${pos === null ? styles['filterPillActive'] : ''}`}
                                onClick={() => setPos(null)}
                            >
                                {t('browse.all')}
                            </button>
                            {Object.values(PartOfSpeech).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className={`${styles['filterPill']} ${pos === p ? styles['filterPillActive'] : ''}`}
                                    onClick={() => setPos(pos === p ? null : p)}
                                >
                                    {t(`pos.${p}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            className={styles['clearFiltersBtn']}
                            onClick={() => {
                                setLevel(null);
                                setPos(null);
                            }}
                        >
                            <X size={12} /> {t('browse.clearFilters')}
                        </button>
                    )}
                </div>
            )}

            {wordListStatus === 'success' && (
                <p className={styles['browseCount']}>
                    <span className={styles['browseCountNum']}>{wordList.length}</span>{' '}
                    {search.length > 0
                        ? t('browse.countFiltered', { count: wordList.length, plural: wordList.length !== 1 ? 's' : '', query: search })
                        : t('browse.count', { count: wordList.length, plural: wordList.length !== 1 ? 's' : '' })}
                </p>
            )}

            {wordListStatus === 'loading' ? (
                <div className={styles['browseLoading']}>
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className={styles['skeletonRow']} style={{ animationDelay: `${i * 0.05}s` }} />
                    ))}
                </div>
            ) : wordList.length === 0 ? (
                <div className={styles['browseEmpty']}>
                    <BookOpen size={36} className={styles['browseEmptyIcon']} />
                    <p className={styles['browseEmptyTitle']}>{t('browse.noResults')}</p>
                    <p className={styles['browseEmptyText']}>
                        {search.length > 0 ? t('browse.noResultsSearch', { query: search }) : t('browse.noResultsFilters')}
                    </p>
                </div>
            ) : (
                <div className={styles['wordList']}>
                    {wordList.map((word) => (
                        <WordCard key={word.id} word={word} />
                    ))}
                </div>
            )}
        </div>
    );
}