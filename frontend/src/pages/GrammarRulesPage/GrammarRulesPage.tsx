import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, AlertCircle, RefreshCw, ArrowRight, Tag } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';

// Импорты для страницы грамматики
import {
  fetchGrammarRules,
  setActiveLevel,
  setSearch,
  selectFilteredGrammarRules,
  selectGrammarRulesListIsLoading,
  selectGrammarRulesListError,
  selectActiveLevel,
  selectGrammarSearch,
} from '@/store/Slices/GrammarRulesSlice';

// НОВЫЕ ИМПОРТЫ ДЛЯ ЗАКЛАДОК
import { fetchBookmarks } from '@/store/Slices/BookMarksSlice';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';

import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './GrammarRulesPage.module.css';
import { Level } from '@/types/globalTypes';
import type { GrammarRuleSummary } from '@/types/grammar/Grammar.types';

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
  A1: '#22c55e',
  A1_PLUS: '#16a34a',
  A2: '#14b8a6',
  A2_PLUS: '#0d9488',
  B1: '#3b82f6',
  B1_PLUS: '#2563eb',
  B2: '#6366f1',
  B2_PLUS: '#4f46e5',
  C1: '#8b5cf6',
  C2: '#a855f7',
};

const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1',
  A1_PLUS: 'A1+',
  A2: 'A2',
  A2_PLUS: 'A2+',
  B1: 'B1',
  B1_PLUS: 'B1+',
  B2: 'B2',
  B2_PLUS: 'B2+',
  C1: 'C1',
  C2: 'C2',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: Level }) {
  const color = LEVEL_COLOR[level] ?? '#6366f1';
  return (
    <span
      className={styles['levelBadge']}
      style={{
        backgroundColor: `${color}1a`,
        color,
        borderColor: `${color}33`,
      }}
    >
      {LEVEL_DISPLAY[level] ?? level}
    </span>
  );
}

function RuleCard({ rule, onClick }: { rule: GrammarRuleSummary; onClick: () => void }) {
  const color = LEVEL_COLOR[rule.level] ?? '#6366f1';

  return (
    <article
      className={styles['card']}
      style={{ '--card-accent': color } as React.CSSProperties}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label={`Open grammar rule: ${rule.topic}`}
    >
      <div className={styles['cardAccentBar']} />

      <div className={styles['cardHead']}>
        <LevelBadge level={rule.level} />

        {/* ОБЕРТКА ДЛЯ КНОПКИ ЗАКЛАДКИ */}
        {/* e.stopPropagation() предотвращает срабатывание onClick всей карточки */}
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          style={{ zIndex: 2, position: 'relative' }} // На случай проблем с кликабельностью
        >
          <BookmarkButton targetId={rule.id} type="GRAMMAR_RULE" size="sm" />
        </div>
      </div>

      <h3 className={styles['cardTopic']}>{rule.topic}</h3>

      {rule.summary.length > 0 && <p className={styles['cardSummary']}>{rule.summary}</p>}

      {rule.signalWords.length > 0 && (
        <div className={styles['signalWords']}>
          <Tag size={11} className={styles['signalIcon']} />
          {rule.signalWords.slice(0, 5).map((w) => (
            <span key={w} className={styles['signalChip']}>
              {w}
            </span>
          ))}
          {rule.signalWords.length > 5 && (
            <span className={styles['signalMore']}>+{rule.signalWords.length - 5}</span>
          )}
        </div>
      )}

      <div className={styles['cardFooter']}>
        <span className={styles['cardCta']}>
          Study rule <ArrowRight size={13} />
        </span>
        {rule.relatedTopics.length > 0 && (
          <span className={styles['cardRelated']}>{rule.relatedTopics.length} related</span>
        )}
      </div>
    </article>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className={styles['emptyState']}>
      <BookOpen size={44} />
      {search.length > 0 ? (
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

// ─── Main component ───────────────────────────────────────────────────────────

export function GrammarRulesPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const rules = useAppSelector(selectFilteredGrammarRules);
  const isLoading = useAppSelector(selectGrammarRulesListIsLoading);
  const error = useAppSelector(selectGrammarRulesListError);
  const activeLevel = useAppSelector(selectActiveLevel);
  const search = useAppSelector(selectGrammarSearch);

  // Fetch grammar rules when level filter changes
  useEffect(() => {
    void dispatch(fetchGrammarRules(activeLevel ?? undefined));
  }, [activeLevel, dispatch]);

  // ЗАГРУЗКА ЗАКЛАДОК ПРИ РЕНДЕРЕ СТРАНИЦЫ
  useEffect(() => {
    void dispatch(fetchBookmarks());
  }, [dispatch]);

  const handleLevelClick = useCallback(
    (level: Level | null) => {
      dispatch(setActiveLevel(level));
    },
    [dispatch],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setSearch(e.target.value));
    },
    [dispatch],
  );

  const handleCardClick = useCallback(
    (slug: string) => {
      navigate(`/grammar-rules/${slug}`);
    },
    [navigate],
  );

  const handleRetry = useCallback(() => {
    void dispatch(fetchGrammarRules(activeLevel ?? undefined));
  }, [activeLevel, dispatch]);

  if (isLoading && rules.length === 0) {
    return <FullPageSpinner label="Loading grammar rules…" />;
  }

  const totalCount = rules.length;

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <div className={styles['headerText']}>
          <h1 className={styles['pageTitle']}>Grammar Rules</h1>
          <p className={styles['pageSubtitle']}>Master every TOEFL grammar pattern from A1 to C2</p>
        </div>
        <div className={styles['headerMeta']}>
          <span className={styles['ruleCount']}>
            {totalCount} rule{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

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
                onClick={() => {
                  handleLevelClick(value);
                }}
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
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      )}

      {isLoading && rules.length > 0 && (
        <div className={styles['refetchBar']}>
          <span className={styles['refetchSpinner']} />
          Updating…
        </div>
      )}

      {rules.length === 0 && !isLoading ? (
        <EmptyState search={search} />
      ) : (
        <section className={styles['grid']} aria-live="polite">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onClick={() => {
                handleCardClick(rule.slug);
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}
