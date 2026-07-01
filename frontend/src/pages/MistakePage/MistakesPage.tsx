import { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  AlertTriangle, RefreshCw, AlertCircle,
  CheckCircle2, XCircle, Clock, RotateCcw,
  BookOpen, Headphones, PenLine, Target,
  Search, SlidersHorizontal,
  ChevronDown, Zap, TrendingDown, Trophy,
  Map, Star,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchMistakes,
  fetchWeakSpots,
  fetchHeatmap,
  fetchDueForReview,
  markMistakeMastered,
  setFilter,
  resetFilters,
  selectFilteredMistakes,
  selectDueCount,
  selectMasteredCount,
  selectOverallAccuracy,
  selectIsMarkMasteredLoading,
} from '@/store/Slices/MistakesSlice';
import {
  mistakeAccuracy,
  isDueForReview,
  type UserMistake,
  type WeakSpot,
  type HeatmapCell,
} from '@/types/mistakes/Mistakes.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './MistakesPage.module.css';


const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
  C1: 'C1', C2: 'C2',
};

const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  QUIZ:      { icon: <Target size={12} />,     color: '#6366f1' },
  WRITING:   { icon: <PenLine size={12} />,    color: '#ec4899' },
  READING:   { icon: <BookOpen size={12} />,   color: '#22c55e' },
  LISTENING: { icon: <Headphones size={12} />, color: '#f59e0b' },
};

const CATEGORY_CONFIG: Record<string, { color: string }> = {
  GRAMMAR:    { color: '#14b8a6' },
  VOCABULARY: { color: '#8b5cf6' },
  SPELLING:   { color: '#ef4444' },
  LOGIC:      { color: '#f59e0b' },
};

const STATUS_CONFIG: Record<string, { color: string }> = {
  LEARNING:  { color: '#ef4444' },
  REVIEWING: { color: '#f59e0b' },
  MASTERED:  { color: '#22c55e' },
};



function formatDate(iso: string, t: TFunction): string {
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return t('mistakes.dates.today');
  if (diffDays === 1) return t('mistakes.dates.yesterday');
  if (diffDays < 7)  return t('mistakes.dates.daysAgo', { count: diffDays });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatNextReview(iso: string | null | undefined, t: TFunction): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  if (d <= now) return t('mistakes.dates.dueNow');
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  if (diffDays === 1) return t('mistakes.dates.tomorrow');
  if (diffDays < 7)  return t('mistakes.dates.inDays', { count: diffDays });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}



function SkeletonCard() {
  return (
    <div className={styles['skeletonCard']} aria-hidden="true">
      <div className={styles['skeletonLine']} style={{ width: '60%', height: 14 }} />
      <div className={styles['skeletonLine']} style={{ width: '40%', height: 10, marginTop: 6 }} />
      <div className={styles['skeletonBar']} />
    </div>
  );
}



function DueBanner({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count === 0) return null;
  const bannerText = t(count === 1 ? 'mistakes.banner.one' : 'mistakes.banner.other', { count });
  return (
    <div className={styles['dueBanner']} role="alert" aria-live="polite">
      <div className={styles['dueBannerLeft']}>
        <span className={styles['dueBannerDot']} aria-hidden="true" />
        <Clock size={15} className={styles['dueBannerIcon']} />
        <span className={styles['dueBannerText']}>{bannerText}</span>
      </div>
      <button type="button" className={styles['dueBannerCta']}>
        {t('mistakes.banner.cta')}
      </button>
    </div>
  );
}



function HeatmapSection({ cells }: { cells: HeatmapCell[] }) {
  const max = Math.max(...cells.map((c) => c.weight), 1);

  return (
    <div className={styles['heatmapGrid']} role="grid" aria-label="Error heatmap">
      {cells.map((cell) => {
        const ratio = cell.weight / max;
        
        const r = Math.round(253 - ratio * 14);
        const g = Math.round(224 - ratio * 132);
        const b = Math.round(204 - ratio * 170);
        const textColor = ratio > 0.5 ? '#7c2d12' : '#92400e';
        return (
          <div
            key={`${cell.topic}-${cell.level}`}
            className={styles['heatmapCell']}
            style={{ background: `rgb(${r},${g},${b})` }}
            role="gridcell"
            title={`${cell.topic} (${cell.level}) — weight ${cell.weight}, ${cell.count} mistake${cell.count !== 1 ? 's' : ''}`}
          >
            <span className={styles['heatmapTopic']} style={{ color: textColor }}>{cell.topic}</span>
            <span className={styles['heatmapMeta']}  style={{ color: textColor }}>{cell.level} · {cell.count}</span>
          </div>
        );
      })}
    </div>
  );
}



function WeakSpotsChart({ spots }: { spots: WeakSpot[] }) {
  const { t } = useTranslation();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const heatmap = useAppSelector((s) => s.mistakes.heatmap);
  const heatmapLoading = useAppSelector((s) => s.mistakes.heatmapLoading);

  if (spots.length === 0) return null;

  const maxWeight = Math.max(...spots.map((s) => s.adjustedWeight), 1);

  return (
    <section className={styles['weakSpots']}>
      <div className={styles['weakSpotsHeader']}>
        <h2 className={styles['sectionTitle']}>
          <TrendingDown size={16} className={styles['sectionTitleIcon']} />
          {t('mistakes.weakSpots.title')}
        </h2>
        <button
          type="button"
          className={`${styles['heatmapToggle']} ${showHeatmap ? styles['heatmapToggleActive'] : ''}`}
          onClick={() => setShowHeatmap((v) => !v)}
          aria-pressed={showHeatmap}
        >
          <Map size={13} />
          {showHeatmap ? t('mistakes.weakSpots.hideHeatmap') : t('mistakes.weakSpots.showHeatmap')}
        </button>
      </div>

      {/* Weak spot bars */}
      <div className={styles['spotsList']}>
        {spots.map((spot, i) => {
          const cat = CATEGORY_CONFIG[spot.category];
          const pct = (spot.adjustedWeight / maxWeight) * 100;
          return (
            <div key={`${spot.topic}-${i}`} className={styles['spotRow']}>
              <div className={styles['spotMeta']}>
                <span className={styles['spotTopic']}>{spot.topic}</span>
                <div className={styles['spotBadges']}>
                  <span
                    className={styles['spotCatBadge']}
                    style={{ '--cat-color': cat?.color } as React.CSSProperties}
                  >
                    {t(`mistakes.filters.categories.${spot.category}`, { defaultValue: spot.category })}
                  </span>
                  <span className={styles['spotLevel']}>
                    {LEVEL_DISPLAY[spot.level] ?? spot.level}
                  </span>
                  {spot.dueForReview && (
                    <span className={styles['spotDuePip']} aria-label="Due for review" />
                  )}
                </div>
              </div>

              <div className={styles['spotBarWrap']}>
                <div className={styles['spotBarTrack']}>
                  <div
                    className={styles['spotBarFill']}
                    style={{ width: `${pct}%`, backgroundColor: cat?.color ?? '#6366f1' }}
                  />
                </div>
                <div className={styles['spotStats']}>
                  <span className={styles['spotWeight']} style={{ color: cat?.color }}>
                    {spot.adjustedWeight.toFixed(1)}
                  </span>
                  <span className={styles['spotAccuracy']}>
                    {spot.accuracy}% acc
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Heatmap toggle panel */}
      {showHeatmap && (
        <div className={styles['heatmapPanel']}>
          <p className={styles['heatmapLabel']}>
            {t('mistakes.weakSpots.heatmapLabel')}
          </p>
          {heatmapLoading ? (
            <div className={styles['heatmapGrid']}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`${styles['heatmapCell']} ${styles['skeletonCell']}`} />
              ))}
            </div>
          ) : heatmap.length > 0 ? (
            <HeatmapSection cells={heatmap} />
          ) : (
            <p className={styles['heatmapEmpty']}>{t('mistakes.weakSpots.heatmapEmpty')}</p>
          )}
        </div>
      )}
    </section>
  );
}



function MistakeCard({ mistake }: { mistake: UserMistake }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const isMarkingMastered = useAppSelector(selectIsMarkMasteredLoading(mistake.id));

  const accuracy = mistakeAccuracy(mistake);
  const due      = isDueForReview(mistake);
  const src      = SOURCE_CONFIG[mistake.source];
  const cat      = CATEGORY_CONFIG[mistake.category];
  const statusConf = STATUS_CONFIG[mistake.status];

  const handleMarkMastered = useCallback(() => {
    void dispatch(markMistakeMastered(mistake.id));
  }, [dispatch, mistake.id]);

  return (
    <article
      className={`${styles['card']} ${due && mistake.status !== 'MASTERED' ? styles['cardDue'] : ''} ${mistake.status === 'MASTERED' ? styles['cardMastered'] : ''}`}
      style={{ '--cat-color': cat?.color ?? '#6366f1' } as React.CSSProperties}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles['cardHead']}>
        <div className={styles['cardHeadLeft']}>
          <div className={styles['cardTopRow']}>
            {/* Source icon pill */}
            <span
              className={styles['srcPill']}
              style={{ '--src-color': src?.color } as React.CSSProperties}
            >
              {src?.icon}
              {t(`mistakes.filters.sources.${mistake.source}`, { defaultValue: mistake.source })}
            </span>

            {/* Due badge */}
            {due && mistake.status !== 'MASTERED' && (
              <span className={styles['dueBadge']}>
                <Clock size={10} />
                {t('mistakes.card.dueNow')}
              </span>
            )}
          </div>

          <h3 className={styles['cardTopic']}>{mistake.topic}</h3>

          <div className={styles['cardBadges']}>
            <span
              className={styles['catBadge']}
              style={{ '--cat-color': cat?.color } as React.CSSProperties}
            >
              {t(`mistakes.filters.categories.${mistake.category}`, { defaultValue: mistake.category })}
            </span>
            <span className={styles['lvlBadge']}>
              {LEVEL_DISPLAY[mistake.level] ?? mistake.level}
            </span>
            <span
              className={styles['statusBadge']}
              style={{ '--status-color': statusConf?.color } as React.CSSProperties}
            >
              {t(`mistakes.filters.statuses.${mistake.status}`, { defaultValue: mistake.status })}
            </span>
          </div>
        </div>

        <div className={styles['cardHeadRight']}>
          {/* Accuracy donut-style indicator */}
          <div
            className={styles['accuracyCircle']}
            style={{
              '--acc-color': accuracy >= 70 ? '#22c55e' : accuracy >= 40 ? '#f59e0b' : '#ef4444',
              '--acc-pct': `${accuracy}`,
            } as React.CSSProperties}
            title={`Accuracy: ${accuracy}%`}
          >
            <span className={styles['accuracyCircleVal']}>{accuracy}%</span>
          </div>

          <button
            type="button"
            className={styles['expandBtn']}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse details' : 'Expand details'}
            aria-expanded={open}
          >
            <ChevronDown
              size={15}
              className={`${styles['expandChevron']} ${open ? styles['expandChevronOpen'] : ''}`}
            />
          </button>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className={styles['cardStats']}>
        <div className={styles['countGroup']}>
          <span className={styles['wrongCount']}>
            <XCircle size={13} /> {mistake.wrongCount}
          </span>
          <span className={styles['correctCount']}>
            <CheckCircle2 size={13} /> {mistake.correctCount}
          </span>
        </div>

        <div className={styles['accuracyWrap']}>
          <div className={styles['accuracyTrack']}>
            <div
              className={styles['accuracyFill']}
              style={{
                width: `${accuracy}%`,
                backgroundColor: accuracy >= 70 ? '#22c55e' : accuracy >= 40 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <span className={styles['accuracyPct']}>{accuracy}%</span>
        </div>

        <span className={`${styles['nextReview']} ${due ? styles['nextReviewDue'] : ''}`}>
          <RotateCcw size={11} />
          {formatNextReview(mistake.nextReview, t)}
        </span>

        <span className={styles['updatedAt']}>{formatDate(mistake.updatedAt, t)}</span>
      </div>

      {/* ── Expanded body ──────────────────────────────────────────────────── */}
      {open && (
        <div className={styles['cardBody']}>
          {/* Extra stats row */}
          <div className={styles['extraStats']}>
            <div className={styles['extraStat']}>
              <span className={styles['extraStatVal']}>{mistake.easeFactor.toFixed(1)}</span>
              <span className={styles['extraStatLabel']}>{t('mistakes.card.easeFactor')}</span>
            </div>
            <div className={styles['extraStat']}>
              <span className={styles['extraStatVal']}>{mistake.wrongCount + mistake.correctCount}</span>
              <span className={styles['extraStatLabel']}>{t('mistakes.card.totalAttempts')}</span>
            </div>
            <div className={styles['extraStat']}>
              <span className={styles['extraStatVal']}>{formatDate(mistake.createdAt, t)}</span>
              <span className={styles['extraStatLabel']}>{t('mistakes.card.firstSeen')}</span>
            </div>
          </div>

          {/* Attempts history */}
          {mistake.attempts.length > 0 ? (
            <div className={styles['attemptsSection']}>
              <div className={styles['attemptsLabel']}>{t('mistakes.card.recentAttempts')}</div>
              <div className={styles['attemptsList']}>
                {mistake.attempts.map((att) => (
                  <div
                    key={att.id}
                    className={`${styles['attemptRow']} ${att.isCorrect ? styles['attemptCorrect'] : styles['attemptWrong']}`}
                  >
                    <span className={styles['attemptIcon']}>
                      {att.isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
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
                    <span className={styles['attemptDate']}>{formatDate(att.createdAt, t)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles['noAttempts']}>{t('mistakes.card.noAttempts')}</div>
          )}

          {/* Actions */}
          {mistake.status !== 'MASTERED' && (
            <div className={styles['cardActions']}>
              <button
                type="button"
                className={`${styles['actionBtn']} ${styles['actionBtnPractice']}`}
                onClick={() => {/* navigate to review with this topic */}}
              >
                <RotateCcw size={13} />
                {t('mistakes.card.practiceTopic')}
              </button>
              <button
                type="button"
                className={`${styles['actionBtn']} ${styles['actionBtnMaster']}`}
                onClick={handleMarkMastered}
                disabled={isMarkingMastered}
              >
                {isMarkingMastered ? (
                  <RefreshCw size={13} className={styles['spinIcon']} />
                ) : (
                  <Star size={13} />
                )}
                {isMarkingMastered ? t('mistakes.card.savingMastered') : t('mistakes.card.markMastered')}
              </button>
            </div>
          )}

          {mistake.status === 'MASTERED' && (
            <div className={styles['masteredNote']}>
              <Trophy size={13} /> {t('mistakes.card.masteredNote')}
            </div>
          )}
        </div>
      )}
    </article>
  );
}



function FilterBar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { filters } = useAppSelector((s) => s.mistakes);
  const [searchDraft, setSearchDraft] = useState(filters.search);

  
  useEffect(() => { setSearchDraft(filters.search); }, [filters.search]);

  
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilter({ key: 'search', value: searchDraft }));
    }, 280);
    return () => clearTimeout(timer);
  }, [searchDraft, dispatch]);

  const sources    = ['QUIZ', 'WRITING', 'READING', 'LISTENING'] as const;
  const categories = ['GRAMMAR', 'VOCABULARY', 'SPELLING', 'LOGIC'] as const;
  const statuses   = ['LEARNING', 'REVIEWING', 'MASTERED'] as const;

  const hasActiveFilters =
    filters.source || filters.category || filters.status || filters.search;

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
          aria-label="Search mistakes by topic"
        />
        {searchDraft && (
          <button
            type="button"
            className={styles['searchClear']}
            onClick={() => { setSearchDraft(''); dispatch(setFilter({ key: 'search', value: '' })); }}
            aria-label="Clear search"
          >
            ×
          </button>
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
            const active = filters.source === src;
            return (
              <button
                key={src}
                type="button"
                className={`${styles['sourceTab']} ${active ? styles['sourceTabActive'] : ''}`}
                style={active ? ({ '--src-color': cfg.color } as React.CSSProperties) : undefined}
                onClick={() => dispatch(setFilter({ key: 'source', value: active ? null : src }))}
              >
                {cfg.icon} {t(`mistakes.filters.sources.${src}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category + Status */}
      <div className={styles['filterRow2']}>
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
              const active = filters.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`${styles['chip']} ${active ? styles['chipActive'] : ''}`}
                  style={active ? ({ '--chip-color': cfg.color } as React.CSSProperties) : undefined}
                  onClick={() => dispatch(setFilter({ key: 'category', value: active ? null : cat }))}
                >
                  {t(`mistakes.filters.categories.${cat}`)}
                </button>
              );
            })}
          </div>
        </div>

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
              const active = filters.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  className={`${styles['chip']} ${active ? styles['chipActive'] : ''}`}
                  style={active ? ({ '--chip-color': cfg.color } as React.CSSProperties) : undefined}
                  onClick={() => dispatch(setFilter({ key: 'status', value: active ? null : st }))}
                >
                  {t(`mistakes.filters.statuses.${st}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {hasActiveFilters && (
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



export default function MistakesPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const { mistakes, weakSpots, isLoading, error } = useAppSelector((s) => s.mistakes);
  const filtered  = useAppSelector(selectFilteredMistakes);
  const dueCount  = useAppSelector(selectDueCount);
  const mastered  = useAppSelector(selectMasteredCount);
  const accuracy  = useAppSelector(selectOverallAccuracy);

  useEffect(() => {
    void dispatch(fetchMistakes());
    void dispatch(fetchWeakSpots());
    void dispatch(fetchHeatmap());
    void dispatch(fetchDueForReview(20));
  }, [dispatch]);

  const handleRetry = useCallback(() => {
    void dispatch(fetchMistakes());
    void dispatch(fetchWeakSpots());
    void dispatch(fetchHeatmap());
  }, [dispatch]);

  if (isLoading && mistakes.length === 0) {
    return <FullPageSpinner label={t('mistakes.loading')} />;
  }

  const sorted = [...filtered].sort((a, b) => {
    const aDue = isDueForReview(a) ? 1 : 0;
    const bDue = isDueForReview(b) ? 1 : 0;
    if (bDue !== aDue) return bDue - aDue;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className={styles['page']}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
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

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error !== null && (
        <div className={styles['errorBanner']} role="alert">
          <AlertCircle size={15} />
          <span>{t('mistakes.error')}</span>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={13} /> {t('mistakes.retry')}
          </button>
        </div>
      )}

      {/* ── Due banner ────────────────────────────────────────────────────── */}
      <DueBanner count={dueCount} />

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
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

      {/* ── Weak spots ────────────────────────────────────────────────────── */}
      {weakSpots.length > 0 && <WeakSpotsChart spots={weakSpots} />}

      {/* ── Empty (no mistakes) ───────────────────────────────────────────── */}
      {!isLoading && error === null && mistakes.length === 0 && (
        <div className={styles['emptyState']}>
          <CheckCircle2 size={56} className={styles['emptyIcon']} />
          <p className={styles['emptyTitle']}>{t('mistakes.empty.title')}</p>
          <p className={styles['emptyHint']}>{t('mistakes.empty.hint')}</p>
        </div>
      )}

      {/* ── Filter bar + list ─────────────────────────────────────────────── */}
      {mistakes.length > 0 && (
        <>
          <FilterBar />

          {/* Loading more (background refresh) */}
          {isLoading && mistakes.length > 0 && (
            <div className={styles['skeletonList']} aria-busy="true" aria-label="Loading mistakes">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className={styles['noResults']}>
              <SlidersHorizontal size={32} className={styles['noResultsIcon']} />
              <p>{t('mistakes.filters.noResults')}</p>
            </div>
          ) : (
            <div className={styles['mistakesList']}>
              {sorted.map((m) => <MistakeCard key={m.id} mistake={m} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}