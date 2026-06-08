import { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertTriangle, RefreshCw, AlertCircle,
    CheckCircle2, XCircle, Clock, RotateCcw,
    BookOpen, Headphones, PenLine, Target,
    Brain, Lightbulb, Flame, Search, SlidersHorizontal,
    ChevronDown, Zap, TrendingDown,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
    fetchMistakes,
    fetchWeakSpots,
    setFilter,
    resetFilters,
    selectFilteredMistakes,
    selectDueCount,
    selectMasteredCount,
    selectOverallAccuracy,
} from '@/store/Slices/MistakesSlice';
import {
    mistakeAccuracy,
    isDueForReview,
    type UserMistake,
    type WeakSpot,
} from '@/types/mistakes/Mistakes.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './MistakesPage.module.css';

// ─── Config maps ──────────────────────────────────────────────────────────────

const LEVEL_DISPLAY: Record<string, string> = {
    A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
    B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+', C1: 'C1', C2: 'C2',
};

const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    QUIZ: { icon: <Target size={12} />, color: '#6366f1', label: 'Quiz' },
    WRITING: { icon: <PenLine size={12} />, color: '#ec4899', label: 'Writing' },
    READING: { icon: <BookOpen size={12} />, color: '#22c55e', label: 'Reading' },
    LISTENING: { icon: <Headphones size={12} />, color: '#f59e0b', label: 'Listening' },
};

const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
    GRAMMAR: { color: '#14b8a6', label: 'Grammar' },
    VOCABULARY: { color: '#8b5cf6', label: 'Vocabulary' },
    SPELLING: { color: '#ef4444', label: 'Spelling' },
    LOGIC: { color: '#f59e0b', label: 'Logic' },
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    LEARNING: { color: '#ef4444', label: 'Learning' },
    REVIEWING: { color: '#f59e0b', label: 'Reviewing' },
    MASTERED: { color: '#22c55e', label: 'Mastered' },
};

function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNextReview(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    if (d <= now) return 'Due now';
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86_400_000);
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── WeakSpotsChart ───────────────────────────────────────────────────────────

function WeakSpotsChart({ spots }: { spots: WeakSpot[] }) {
    const { t } = useTranslation();
    if (spots.length === 0) return null;

    const maxWeight = Math.max(...spots.map((s) => s.errorWeight), 1);

    return (
        <section className={styles['weakSpots']}>
            <h2 className={styles['sectionTitle']}>
                <TrendingDown size={16} className={styles['sectionTitleIcon']} />
                {t('mistakes.weakSpots.title')}
            </h2>
            <div className={styles['spotsList']}>
                {spots.map((spot, i) => {
                    const cat = CATEGORY_CONFIG[spot.category];
                    const pct = (spot.errorWeight / maxWeight) * 100;
                    return (
                        <div key={`${spot.topic}-${i}`} className={styles['spotRow']}>
                            <div className={styles['spotMeta']}>
                                <span className={styles['spotTopic']}>{spot.topic}</span>
                                <div className={styles['spotBadges']}>
                                    <span
                                        className={styles['spotCatBadge']}
                                        style={{ '--cat-color': cat?.color } as React.CSSProperties}
                                    >
                                        {cat?.label ?? spot.category}
                                    </span>
                                    <span className={styles['spotLevel']}>
                                        {LEVEL_DISPLAY[spot.level] ?? spot.level}
                                    </span>
                                </div>
                            </div>
                            <div className={styles['spotBarWrap']}>
                                <div className={styles['spotBarTrack']}>
                                    <div
                                        className={styles['spotBarFill']}
                                        style={{
                                            width: `${pct}%`,
                                            backgroundColor: cat?.color ?? '#6366f1',
                                        }}
                                    />
                                </div>
                                <span className={styles['spotWeight']}>
                                    {spot.errorWeight} {t('mistakes.weakSpots.errors')}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

// ─── MistakeCard ──────────────────────────────────────────────────────────────

function MistakeCard({ mistake }: { mistake: UserMistake }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const accuracy = mistakeAccuracy(mistake);
    const due = isDueForReview(mistake);
    const src = SOURCE_CONFIG[mistake.source];
    const cat = CATEGORY_CONFIG[mistake.category];
    const statusConf = STATUS_CONFIG[mistake.status];
    const total = mistake.wrongCount + mistake.correctCount;

    return (
        <article
            className={`${styles['card']} ${due ? styles['cardDue'] : ''}`}
            style={{ '--cat-color': cat?.color ?? '#6366f1' } as React.CSSProperties}
        >
            {/* ── Card header ── */}
            <div className={styles['cardHead']}>
                <div className={styles['cardHeadLeft']}>
                    {/* Topic */}
                    <h3 className={styles['cardTopic']}>{mistake.topic}</h3>

                    {/* Badges row */}
                    <div className={styles['cardBadges']}>
                        {/* Source */}
                        <span
                            className={styles['srcBadge']}
                            style={{ '--src-color': src?.color } as React.CSSProperties}
                        >
                            {src?.icon}
                            {src?.label ?? mistake.source}
                        </span>

                        {/* Category */}
                        <span
                            className={styles['catBadge']}
                            style={{ '--cat-color': cat?.color } as React.CSSProperties}
                        >
                            {cat?.label ?? mistake.category}
                        </span>

                        {/* Level */}
                        <span className={styles['lvlBadge']}>
                            {LEVEL_DISPLAY[mistake.level] ?? mistake.level}
                        </span>

                        {/* Due badge */}
                        {due && (
                            <span className={styles['dueBadge']}>
                                <Clock size={10} />
                                {t('mistakes.card.dueNow')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status + toggle */}
                <div className={styles['cardHeadRight']}>
                    <span
                        className={styles['statusBadge']}
                        style={{ '--status-color': statusConf?.color } as React.CSSProperties}
                    >
                        {statusConf?.label ?? mistake.status}
                    </span>
                    <button
                        type="button"
                        className={styles['expandBtn']}
                        onClick={() => setOpen((o) => !o)}
                        aria-label="Toggle details"
                    >
                        <ChevronDown
                            size={15}
                            className={`${styles['expandChevron']} ${open ? styles['expandChevronOpen'] : ''}`}
                        />
                    </button>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div className={styles['cardStats']}>
                {/* Wrong / Correct counters */}
                <div className={styles['countGroup']}>
                    <span className={styles['wrongCount']}>
                        <XCircle size={13} />
                        {mistake.wrongCount}
                    </span>
                    <span className={styles['correctCount']}>
                        <CheckCircle2 size={13} />
                        {mistake.correctCount}
                    </span>
                </div>

                {/* Accuracy bar */}
                <div className={styles['accuracyWrap']}>
                    <div className={styles['accuracyTrack']}>
                        <div
                            className={styles['accuracyFill']}
                            style={{
                                width: `${accuracy}%`,
                                backgroundColor:
                                    accuracy >= 70 ? '#22c55e' :
                                        accuracy >= 40 ? '#f59e0b' : '#ef4444',
                            }}
                        />
                    </div>
                    <span className={styles['accuracyPct']}>{accuracy}%</span>
                </div>

                {/* Next review */}
                <span className={`${styles['nextReview']} ${due ? styles['nextReviewDue'] : ''}`}>
                    <RotateCcw size={11} />
                    {formatNextReview(mistake.nextReview)}
                </span>

                {/* Updated */}
                <span className={styles['updatedAt']}>
                    {formatDate(mistake.updatedAt)}
                </span>
            </div>

            {/* ── Expanded: attempts history ── */}
            {open && mistake.attempts.length > 0 && (
                <div className={styles['attemptsSection']}>
                    <div className={styles['attemptsLabel']}>
                        {t('mistakes.card.recentAttempts')}
                    </div>
                    <div className={styles['attemptsList']}>
                        {mistake.attempts.map((att) => (
                            <div
                                key={att.id}
                                className={`${styles['attemptRow']} ${att.isCorrect ? styles['attemptCorrect'] : styles['attemptWrong']}`}
                            >
                                <span className={styles['attemptIcon']}>
                                    {att.isCorrect
                                        ? <CheckCircle2 size={13} />
                                        : <XCircle size={13} />}
                                </span>
                                <span className={styles['attemptAnswer']}>
                                    {att.isCorrect ? (
                                        <span className={styles['answerCorrect']}>{att.correctAnswer}</span>
                                    ) : (
                                        <>
                                            <span className={styles['answerWrong']}>{att.userAnswer}</span>
                                            <span className={styles['answerArrow']}>→</span>
                                            <span className={styles['answerCorrect']}>{att.correctAnswer}</span>
                                        </>
                                    )}
                                </span>
                                <span className={styles['attemptDate']}>
                                    {formatDate(att.createdAt)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {open && mistake.attempts.length === 0 && (
                <div className={styles['noAttempts']}>
                    {t('mistakes.card.noAttempts')}
                </div>
            )}
        </article>
    );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { filters } = useAppSelector((state) => state.mistakes);
    const [searchDraft, setSearchDraft] = useState(filters.search);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            dispatch(setFilter({ key: 'search', value: searchDraft }));
        }, 300);
        return () => clearTimeout(t);
    }, [searchDraft, dispatch]);

    const sources = ['QUIZ', 'WRITING', 'READING', 'LISTENING'];
    const categories = ['GRAMMAR', 'VOCABULARY', 'SPELLING', 'LOGIC'];
    const statuses = ['LEARNING', 'REVIEWING', 'MASTERED'];

    return (
        <div className={styles['filterBar']}>
            {/* Search */}
            <div className={styles['searchWrap']}>
                <Search size={14} className={styles['searchIcon']} />
                <input
                    type="text"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder={t('mistakes.filters.searchPlaceholder')}
                    className={styles['searchInput']}
                />
                {searchDraft && (
                    <button
                        type="button"
                        className={styles['searchClear']}
                        onClick={() => { setSearchDraft(''); dispatch(setFilter({ key: 'search', value: '' })); }}
                    >×</button>
                )}
            </div>

            {/* Source tabs */}
            <div className={styles['filterRow']}>
                <span className={styles['filterRowLabel']}>{t('mistakes.filters.source')}</span>
                <div className={styles['sourceTabs']}>
                    <button
                        type="button"
                        className={`${styles['sourceTab']} ${filters.source === null ? styles['sourceTabActive'] : ''}`}
                        onClick={() => dispatch(setFilter({ key: 'source', value: null }))}
                    >
                        {t('mistakes.filters.all')}
                    </button>
                    {sources.map((src) => {
                        const cfg = SOURCE_CONFIG[src]!;
                        return (
                            <button
                                key={src}
                                type="button"
                                className={`${styles['sourceTab']} ${filters.source === src ? styles['sourceTabActive'] : ''}`}
                                style={filters.source === src ? ({ '--src-color': cfg.color } as React.CSSProperties) : undefined}
                                onClick={() => dispatch(setFilter({ key: 'source', value: filters.source === src ? null : src }))}
                            >
                                {cfg.icon}
                                {cfg.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Category + Status */}
            <div className={styles['filterRow2']}>
                {/* Category chips */}
                <div className={styles['filterGroup']}>
                    <span className={styles['filterRowLabel']}>{t('mistakes.filters.category')}</span>
                    <div className={styles['chips']}>
                        <button
                            type="button"
                            className={`${styles['chip']} ${filters.category === null ? styles['chipActive'] : ''}`}
                            onClick={() => dispatch(setFilter({ key: 'category', value: null }))}
                        >
                            {t('mistakes.filters.all')}
                        </button>
                        {categories.map((cat) => {
                            const cfg = CATEGORY_CONFIG[cat]!;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    className={`${styles['chip']} ${filters.category === cat ? styles['chipActive'] : ''}`}
                                    style={filters.category === cat ? ({ '--chip-color': cfg.color } as React.CSSProperties) : undefined}
                                    onClick={() => dispatch(setFilter({ key: 'category', value: filters.category === cat ? null : cat }))}
                                >
                                    {cfg.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Status chips */}
                <div className={styles['filterGroup']}>
                    <span className={styles['filterRowLabel']}>{t('mistakes.filters.status')}</span>
                    <div className={styles['chips']}>
                        <button
                            type="button"
                            className={`${styles['chip']} ${filters.status === null ? styles['chipActive'] : ''}`}
                            onClick={() => dispatch(setFilter({ key: 'status', value: null }))}
                        >
                            {t('mistakes.filters.all')}
                        </button>
                        {statuses.map((st) => {
                            const cfg = STATUS_CONFIG[st]!;
                            return (
                                <button
                                    key={st}
                                    type="button"
                                    className={`${styles['chip']} ${filters.status === st ? styles['chipActive'] : ''}`}
                                    style={filters.status === st ? ({ '--chip-color': cfg.color } as React.CSSProperties) : undefined}
                                    onClick={() => dispatch(setFilter({ key: 'status', value: filters.status === st ? null : st }))}
                                >
                                    {cfg.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Reset */}
            {(filters.source || filters.category || filters.status || filters.search) && (
                <button
                    type="button"
                    className={styles['resetBtn']}
                    onClick={() => { dispatch(resetFilters()); setSearchDraft(''); }}
                >
                    <RefreshCw size={13} />
                    {t('mistakes.filters.reset')}
                </button>
            )}
        </div>
    );
}

// ─── MistakesPage ─────────────────────────────────────────────────────────────

export default function MistakesPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const { mistakes, weakSpots, isLoading, error } =
        useAppSelector((state) => state.mistakes);

    const filtered = useAppSelector(selectFilteredMistakes);
    const dueCount = useAppSelector(selectDueCount);
    const mastered = useAppSelector(selectMasteredCount);
    const accuracy = useAppSelector(selectOverallAccuracy);

    useEffect(() => {
        void dispatch(fetchMistakes());
        void dispatch(fetchWeakSpots());
    }, [dispatch]);

    const handleRetry = useCallback(() => {
        void dispatch(fetchMistakes());
        void dispatch(fetchWeakSpots());
    }, [dispatch]);

    if (isLoading && mistakes.length === 0) {
        return <FullPageSpinner label={t('mistakes.loading')} />;
    }

    return (
        <div className={styles['page']}>
            {/* ── Header ── */}
            <header className={styles['header']}>
                <div>
                    <h1 className={styles['pageTitle']}>
                        <AlertTriangle size={22} className={styles['pageTitleIcon']} />
                        {t('mistakes.title')}
                    </h1>
                    <p className={styles['pageSubtitle']}>{t('mistakes.subtitle')}</p>
                </div>
                {mistakes.length > 0 && (
                    <span className={styles['totalBadge']}>
                        {mistakes.length} {t('mistakes.total')}
                    </span>
                )}
            </header>

            {/* ── Error banner ── */}
            {error !== null && (
                <div className={styles['errorBanner']}>
                    <AlertCircle size={15} />
                    <span>{t('mistakes.error')}</span>
                    <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
                        <RefreshCw size={13} /> {t('mistakes.retry')}
                    </button>
                </div>
            )}

            {/* ── Stats row ── */}
            {mistakes.length > 0 && (
                <div className={styles['statsRow']}>
                    <div className={styles['statCard']}>
                        <div className={`${styles['statIcon']} ${styles['purple']}`}>
                            <AlertTriangle size={16} />
                        </div>
                        <div className={styles['statInfo']}>
                            <span className={styles['statVal']}>{mistakes.length}</span>
                            <span className={styles['statLabel']}>{t('mistakes.stats.total')}</span>
                        </div>
                    </div>

                    <div className={`${styles['statCard']} ${dueCount > 0 ? styles['statCardDue'] : ''}`}>
                        <div className={`${styles['statIcon']} ${styles['red']}`}>
                            <Clock size={16} />
                        </div>
                        <div className={styles['statInfo']}>
                            <span className={styles['statVal']} style={{ color: dueCount > 0 ? '#ef4444' : undefined }}>
                                {dueCount}
                            </span>
                            <span className={styles['statLabel']}>{t('mistakes.stats.dueReview')}</span>
                        </div>
                    </div>

                    <div className={styles['statCard']}>
                        <div className={`${styles['statIcon']} ${styles['green']}`}>
                            <CheckCircle2 size={16} />
                        </div>
                        <div className={styles['statInfo']}>
                            <span className={styles['statVal']}>{mastered}</span>
                            <span className={styles['statLabel']}>{t('mistakes.stats.mastered')}</span>
                        </div>
                    </div>

                    <div className={styles['statCard']}>
                        <div className={`${styles['statIcon']} ${styles['amber']}`}>
                            <Zap size={16} />
                        </div>
                        <div className={styles['statInfo']}>
                            <span className={styles['statVal']}>{accuracy}%</span>
                            <span className={styles['statLabel']}>{t('mistakes.stats.accuracy')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Weak spots chart ── */}
            {weakSpots.length > 0 && <WeakSpotsChart spots={weakSpots} />}

            {/* ── Empty (no mistakes at all) ── */}
            {!isLoading && error === null && mistakes.length === 0 && (
                <div className={styles['emptyState']}>
                    <CheckCircle2 size={56} className={styles['emptyIcon']} />
                    <p className={styles['emptyTitle']}>{t('mistakes.empty.title')}</p>
                    <p className={styles['emptyHint']}>{t('mistakes.empty.hint')}</p>
                </div>
            )}

            {/* ── Filter bar + list ── */}
            {mistakes.length > 0 && (
                <>
                    <FilterBar />

                    {filtered.length === 0 ? (
                        <div className={styles['noResults']}>
                            <SlidersHorizontal size={32} className={styles['noResultsIcon']} />
                            <p>{t('mistakes.filters.noResults')}</p>
                        </div>
                    ) : (
                        <div className={styles['mistakesList']}>
                            {/* Due first, then by updatedAt desc */}
                            {[...filtered]
                                .sort((a, b) => {
                                    const aDue = isDueForReview(a) ? 1 : 0;
                                    const bDue = isDueForReview(b) ? 1 : 0;
                                    if (bDue !== aDue) return bDue - aDue;
                                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                                })
                                .map((m) => (
                                    <MistakeCard key={m.id} mistake={m} />
                                ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}