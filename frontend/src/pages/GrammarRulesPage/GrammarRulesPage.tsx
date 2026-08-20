import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Search, AlertCircle, RefreshCw, ArrowRight,
  Tag, CheckCircle2, Circle, Clock, GraduationCap, Sparkles,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';
import {
  fetchGrammarRules,
  setActiveLevel,
  setActiveTier,
  setSearch,
  selectFilteredGrammarRules,
  selectGrammarRulesListIsLoading,
  selectGrammarRulesListError,
  selectActiveLevel,
  selectActiveTier,
  selectGrammarSearch,
} from '@/store/Slices/GrammarRulesSlice';
import type { GrammarRuleSummary, GrammarTier, GrammarUserStatus } from '@/types/grammar/Grammar.types';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';
import styles from './GrammarRulesPage.module.css';
import { Level } from '@/types/globalTypes';

const LEVELS: Array<{ value: Level | null; label: string }> = [
  { value: null, label: 'All' },
  { value: Level.A1, label: 'A1' },
  { value: Level.A1_PLUS, label: 'A1+' },
  { value: Level.A2, label: 'A2' },
  { value: Level.A2_PLUS, label: 'A2+' },
  { value: Level.B1, label: 'B1' },
  { value: Level.B1_PLUS, label: 'B1+' },
  { value: Level.B2, label: 'B2' },
  { value: Level.B2_PLUS, label: 'B2+' },
  { value: Level.C1, label: 'C1' },
  { value: Level.C2, label: 'C2' },
];

const LEVEL_COLOR: Record<string, string> = {
  A1: '#22c55e', A1_PLUS: '#16a34a', A2: '#14b8a6', A2_PLUS: '#0d9488',
  B1: '#3b82f6', B1_PLUS: '#2563eb', B2: '#6366f1', B2_PLUS: '#4f46e5',
  C1: '#8b5cf6', C2: '#a855f7',
};

const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
  C1: 'C1', C2: 'C2',
};

const STATUS_CONFIG: Record<GrammarUserStatus, { icon: React.ElementType; label: string; color: string }> = {
  not_started: { icon: Circle, label: 'Not started', color: 'var(--text-3)' },
  in_progress: { icon: Clock, label: 'In progress', color: '#3b82f6' },
  mastered: { icon: CheckCircle2, label: 'Mastered', color: '#22c55e' },
};

const SEARCH_DEBOUNCE_MS = 350;

function LevelBadge({ level }: { level: Level }) {
  const color = LEVEL_COLOR[level] ?? '#6366f1';
  return (
    <span className={styles['levelBadge']} style={{ backgroundColor: `${color}1a`, color, borderColor: `${color}33` }}>
      {LEVEL_DISPLAY[level] ?? level}
    </span>
  );
}

function TierBadge({ tier }: { tier: GrammarTier }) {
  const isAdvanced = tier === 'ADVANCED';
  return (
    <span className={`${styles['tierChip']} ${isAdvanced ? styles['tierChipAdvanced'] : styles['tierChipFoundation']}`}>
      {isAdvanced ? <Sparkles size={11} /> : <GraduationCap size={11} />}
      {isAdvanced ? 'Advanced' : 'Foundation'}
    </span>
  );
}

function UserStatusBadge({ status }: { status: GrammarUserStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  if (status === 'not_started') return null;
  return (
    <span className={styles['statusBadge']} style={{ color: cfg.color }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className={`${styles['card']} ${styles['skeleton']}`}>
      <div className={styles['cardAccentBar']} />
      <div className={styles['cardHead']}>
        <div className={styles['skeletonBadge']} />
      </div>
      <div className={styles['skeletonTitle']} />
      <div className={styles['skeletonText']} />
      <div className={styles['skeletonTextShort']} />
      <div className={styles['cardFooter']}>
        <div className={styles['skeletonBtn']} />
      </div>
    </div>
  );
}

function RuleCard({ rule, onClick }: { rule: GrammarRuleSummary; onClick: () => void }) {
  const color = LEVEL_COLOR[rule.level] ?? '#6366f1';

  return (
    <article className={styles['card']} style={{ '--card-accent': color } as React.CSSProperties}>
      <div className={styles['cardAccentBar']} />

      <div className={styles['cardHead']}>
        <div className={styles['cardHeadLeft']}>
          <LevelBadge level={rule.level} />
          <TierBadge tier={rule.tier} />
          <UserStatusBadge status={rule.userStatus} />
        </div>
        <div className={styles['bookmarkWrapper']}>
          <BookmarkButton targetId={rule.id} type="GRAMMAR_RULE" size="sm" />
        </div>
      </div>

      <h3 className={styles['cardTopic']}>{rule.topic}</h3>

      {(rule.summary?.length ?? 0) > 0 && <p className={styles['cardSummary']}>{rule.summary}</p>}

      {(rule.signalWords?.length ?? 0) > 0 && (
        <div className={styles['signalWords']}>
          <Tag size={11} className={styles['signalIcon']} />
          {rule.signalWords.slice(0, 5).map((w) => (
            <span key={w} className={styles['signalChip']}>{w}</span>
          ))}
          {rule.signalWords.length > 5 && <span className={styles['signalMore']}>+{rule.signalWords.length - 5}</span>}
        </div>
      )}

      <div className={styles['cardFooter']}>
        <button type="button" className={styles['cardCta']} onClick={onClick} aria-label={`Study grammar rule: ${rule.topic}`}>
          Study rule <ArrowRight size={13} className={styles['cardArrow']} />
        </button>
        {rule.exerciseCount > 0 && (
          <span className={styles['exerciseCount']}>
            {rule.exerciseCount} exercise{rule.exerciseCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </article>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className={styles['emptyState']}>
      <BookOpen size={44} />
      {(search?.length ?? 0) > 0 ? (
        <>
          <p className={styles['emptyTitle']}>No rules match "{search}"</p>
          <p className={styles['emptyHint']}>Try a different search term or clear the filter.</p>
        </>
      ) : (
        <>
          <p className={styles['emptyTitle']}>No grammar rules yet</p>
          <p className={styles['emptyHint']}>Rules will appear here once they're added.</p>
        </>
      )}
    </div>
  );
}

export function GrammarRulesPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rules = useAppSelector(selectFilteredGrammarRules);
  const isLoading = useAppSelector(selectGrammarRulesListIsLoading);
  const error = useAppSelector(selectGrammarRulesListError);
  const activeLevel = useAppSelector(selectActiveLevel);
  const activeTier = useAppSelector(selectActiveTier);
  const search = useAppSelector(selectGrammarSearch);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const params: { level?: Level; tier?: GrammarTier; search?: string } = { tier: activeTier };
    if (activeLevel !== null) params.level = activeLevel;
    if ((search?.trim()?.length ?? 0) > 0) params.search = search.trim();
    void dispatch(fetchGrammarRules(params));
  }, [activeLevel, activeTier, dispatch]);

  const handleLevelClick = useCallback((level: Level | null) => {
    dispatch(setActiveLevel(level));
  }, [dispatch]);

  const handleTierClick = useCallback((tier: GrammarTier) => {
    dispatch(setActiveTier(tier));
  }, [dispatch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch(setSearch(value));

    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params: { level?: Level; tier?: GrammarTier; search?: string } = { tier: activeTier };
      if (activeLevel !== null) params.level = activeLevel;
      if ((value?.trim()?.length ?? 0) > 0) params.search = value.trim();
      void dispatch(fetchGrammarRules(params));
    }, SEARCH_DEBOUNCE_MS);
  }, [dispatch, activeLevel, activeTier]);

  const handleCardClick = useCallback((slug: string) => {
    navigate(`/grammar/${slug}`);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    const params: { level?: Level; tier?: GrammarTier; search?: string } = { tier: activeTier };
    if (activeLevel !== null) params.level = activeLevel;
    if ((search?.trim()?.length ?? 0) > 0) params.search = search.trim();
    void dispatch(fetchGrammarRules(params));
  }, [activeLevel, activeTier, search, dispatch]);

  const statusCounts = {
    in_progress: rules?.filter((r) => r.userStatus === 'in_progress').length ?? 0,
    mastered: rules?.filter((r) => r.userStatus === 'mastered').length ?? 0,
  };

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <div className={styles['headerText']}>
          <h1 className={styles['pageTitle']}>Grammar</h1>
          <p className={styles['pageSubtitle']}>Master every TOEFL grammar pattern from A1 to C2</p>
        </div>
        <div className={styles['headerMeta']}>
          <span className={styles['ruleCount']}>{rules?.length ?? 0} rules</span>
          {statusCounts.in_progress > 0 && (
            <span className={styles['inProgressCount']}><Clock size={12} /> {statusCounts.in_progress} in progress</span>
          )}
          {statusCounts.mastered > 0 && (
            <span className={styles['masteredCount']}><CheckCircle2 size={12} /> {statusCounts.mastered} mastered</span>
          )}
        </div>
      </header>

      <div className={styles['tierTabs']} role="tablist" aria-label={t('grammar.reader.tierSwitchLabel')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTier === 'FOUNDATION'}
          className={`${styles['tierTab']} ${activeTier === 'FOUNDATION' ? styles['tierTabActive'] : ''}`}
          onClick={() => handleTierClick('FOUNDATION')}
        >
          <GraduationCap size={15} />
          {t('grammar.reader.tierFoundation')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTier === 'ADVANCED'}
          className={`${styles['tierTab']} ${styles['tierTabAdvanced']} ${activeTier === 'ADVANCED' ? styles['tierTabActive'] : ''}`}
          onClick={() => handleTierClick('ADVANCED')}
        >
          <Sparkles size={15} />
          {t('grammar.reader.tierAdvanced')}
        </button>
      </div>

      <div className={styles['toolbar']}>
        <div className={styles['searchWrap']}>
          <Search size={16} className={styles['searchIcon']} />
          <input
            type="search"
            className={styles['searchInput']}
            placeholder="Search topics, signal words…"
            value={search}
            onChange={handleSearchChange}
            aria-label="Search grammar rules"
          />
        </div>

        <div className={styles['levelFilters']} role="group" aria-label="Filter by CEFR level">
          {LEVELS.map(({ value, label }) => {
            const isActive = activeLevel === value;
            const color = value !== null ? LEVEL_COLOR[value] : 'var(--accent)';
            return (
              <button
                key={label}
                type="button"
                className={`${styles['levelPill']} ${isActive ? styles['levelPillActive'] : ''}`}
                style={isActive ? ({ '--pill-color': color } as React.CSSProperties) : undefined}
                onClick={() => handleLevelClick(value)}
                aria-pressed={isActive}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error !== null && (
        <div className={styles['errorBanner']}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" onClick={handleRetry} className={styles['retryBtn']}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {isLoading && (rules?.length ?? 0) > 0 && (
        <div className={styles['refetchBar']}>
          <span className={styles['refetchSpinner']} />
          Updating…
        </div>
      )}

      {(rules?.length ?? 0) === 0 && !isLoading ? (
        <EmptyState search={search} />
      ) : (
        <section className={styles['grid']} aria-live="polite">
          {isLoading && (rules?.length ?? 0) === 0
            ? Array.from({ length: 6 }).map((_, idx) => <CardSkeleton key={idx} />)
            : rules?.map((rule) => (
                <RuleCard key={rule.id} rule={rule} onClick={() => handleCardClick(rule.slug)} />
              ))}
        </section>
      )}
    </div>
  );
}