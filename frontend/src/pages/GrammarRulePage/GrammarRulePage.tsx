import { useEffect, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  AlignLeft,
  GitCompare,
  XCircle,
  Tag,
  Link2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/store';
import {
  fetchGrammarRuleDetail,
  clearDetail,
  selectGrammarRuleDetail,
  selectGrammarRuleDetailIsLoading,
  selectGrammarRuleDetailError,
} from '@/store/Slices/GrammarRulesSlice';

import { fetchBookmarks } from '@/store/Slices/BookMarksSlice';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';

import type {
  GrammarExample,
  GrammarUsage,
  GrammarSection,
  GrammarComparison,
} from '@/types/grammar/Grammar.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './GrammarRulePage.module.css';

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

type TabKey = 'overview' | 'usages' | 'mistakes' | 'compare';

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'overview', label: 'Overview', icon: <BookOpen size={14} /> },
  { key: 'usages', label: 'Examples', icon: <AlignLeft size={14} /> },
  { key: 'mistakes', label: 'Mistakes', icon: <XCircle size={14} /> },
  { key: 'compare', label: 'Compare', icon: <GitCompare size={14} /> },
];

function ExampleBlock({ examples }: { examples: GrammarExample[] }) {
  if (examples.length === 0) {
    return null;
  }
  return (
    <ul className={styles['exampleList']}>
      {examples.map((ex, i) => (
        <li key={i} className={styles['exampleItem']}>
          <span className={styles['exampleSentence']}>{ex.sentence}</span>
          {ex.translation !== undefined && ex.translation.length > 0 && (
            <span className={styles['exampleTranslation']}>{ex.translation}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Accordion({
  title,
  subtitle,
  children,
  defaultOpen = false,
  accentColor,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`${styles['accordion']} ${open ? styles['accordionOpen'] : ''}`}>
      <button
        type="button"
        className={styles['accordionTrigger']}
        onClick={() => {
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        style={accentColor ? ({ '--acc-color': accentColor } as React.CSSProperties) : undefined}
      >
        <div className={styles['accordionTriggerLeft']}>
          <span className={styles['accordionTitle']}>{title}</span>
          {subtitle !== undefined && (
            <span className={styles['accordionSubtitle']}>{subtitle}</span>
          )}
        </div>
        <span
          className={`${styles['accordionChevron']} ${open ? styles['accordionChevronOpen'] : ''}`}
        >
          <ChevronDown size={16} />
        </span>
      </button>

      {open && <div className={styles['accordionBody']}>{children}</div>}
    </div>
  );
}

function OverviewTab({
  coreConcept,
  structure,
  signalWords,
}: {
  coreConcept: string;
  structure: string;
  signalWords: string[];
}) {
  return (
    <div className={styles['tabContent']}>
      {coreConcept.length > 0 && (
        <section className={styles['overviewSection']}>
          <div className={styles['sectionLabel']}>
            <Lightbulb size={14} />
            Core Concept
          </div>
          <p className={styles['overviewBody']}>{coreConcept}</p>
        </section>
      )}

      {structure.length > 0 && (
        <section className={styles['overviewSection']}>
          <div className={styles['sectionLabel']}>
            <AlignLeft size={14} />
            Structure
          </div>
          <div className={styles['structureBlock']}>
            <code className={styles['structureCode']}>{structure}</code>
          </div>
        </section>
      )}

      {signalWords.length > 0 && (
        <section className={styles['overviewSection']}>
          <div className={styles['sectionLabel']}>
            <Tag size={14} />
            Signal Words
          </div>
          <div className={styles['signalWordsList']}>
            {signalWords.map((w) => (
              <span key={w} className={styles['signalWord']}>
                {w}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function UsagesTab({ usages, sections }: { usages: GrammarUsage[]; sections: GrammarSection[] }) {
  const hasContent = usages.length > 0 || sections.length > 0;

  if (!hasContent) {
    return (
      <div className={styles['emptyTab']}>
        <AlignLeft size={32} />
        <p>No examples added yet.</p>
      </div>
    );
  }

  return (
    <div className={styles['tabContent']}>
      {usages.length > 0 && (
        <div className={styles['accordionGroup']}>
          <p className={styles['groupLabel']}>Usage patterns</p>
          {usages.map((usage, i) => (
            <Accordion
              key={i}
              title={usage.title}
              subtitle={usage.explanation}
              defaultOpen={i === 0}
            >
              <p className={styles['usageExplanation']}>{usage.explanation}</p>
              <ExampleBlock examples={usage.examples} />
            </Accordion>
          ))}
        </div>
      )}

      {sections.length > 0 && (
        <div className={styles['accordionGroup']}>
          <p className={styles['groupLabel']}>Additional notes</p>
          {sections.map((sec, i) => (
            <Accordion key={i} title={sec.title} defaultOpen={false}>
              <p className={styles['sectionContent']}>{sec.content}</p>
              <ExampleBlock examples={sec.examples} />
            </Accordion>
          ))}
        </div>
      )}
    </div>
  );
}

function MistakesTab({ mistakes }: { mistakes: string[] }) {
  if (mistakes.length === 0) {
    return (
      <div className={styles['emptyTab']}>
        <XCircle size={32} />
        <p>No common mistakes listed yet.</p>
      </div>
    );
  }

  return (
    <div className={styles['tabContent']}>
      <div className={styles['mistakesBanner']}>
        <XCircle size={15} />
        Avoid these common errors — they appear frequently on the TOEFL.
      </div>
      <ul className={styles['mistakeList']}>
        {mistakes.map((m, i) => (
          <li key={i} className={styles['mistakeItem']}>
            <span className={styles['mistakeNum']}>{i + 1}</span>
            <span className={styles['mistakeText']}>{m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompareTab({
  comparisons,
  onNavigate,
}: {
  comparisons: GrammarComparison[];
  onNavigate: (topic: string) => void;
}) {
  if (comparisons.length === 0) {
    return (
      <div className={styles['emptyTab']}>
        <GitCompare size={32} />
        <p>No comparisons added yet.</p>
      </div>
    );
  }

  return (
    <div className={styles['tabContent']}>
      {comparisons.map((comp, i) => (
        <Accordion key={i} title={`vs. ${comp.compareWith}`} defaultOpen={i === 0}>
          <p className={styles['compExplanation']}>{comp.explanation}</p>
          <ExampleBlock examples={comp.examples} />
          <button
            type="button"
            className={styles['compLink']}
            onClick={() => {
              onNavigate(comp.compareWith);
            }}
          >
            <Link2 size={12} />
            View {comp.compareWith} rule
            <ChevronRight size={12} />
          </button>
        </Accordion>
      ))}
    </div>
  );
}

function Sidebar({
  relatedTopics,
  onNavigate,
}: {
  relatedTopics: string[];
  onNavigate: (topic: string) => void;
}) {
  if (relatedTopics.length === 0) {
    return null;
  }

  return (
    <aside className={styles['sidebar']}>
      <div className={styles['sidebarCard']}>
        <h3 className={styles['sidebarTitle']}>Related Topics</h3>
        <ul className={styles['relatedList']}>
          {relatedTopics.map((topic) => (
            <li key={topic}>
              <button
                type="button"
                className={styles['relatedItem']}
                onClick={() => {
                  onNavigate(topic);
                }}
              >
                <ChevronRight size={13} className={styles['relatedArrow']} />
                {topic}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function GrammarRulePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const rule = useAppSelector(selectGrammarRuleDetail);
  const isLoading = useAppSelector(selectGrammarRuleDetailIsLoading);
  const error = useAppSelector(selectGrammarRuleDetailError);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  useEffect(() => {
    void dispatch(fetchBookmarks());
  }, [dispatch]);

  useEffect(() => {
    if (slug === undefined) {
      return;
    }
    void dispatch(fetchGrammarRuleDetail(slug));
    return () => {
      dispatch(clearDetail());
    };
  }, [slug, dispatch]);

  const handleBack = useCallback(() => {
    navigate('/grammar-rules');
  }, [navigate]);

  const handleRetry = useCallback(() => {
    if (slug !== undefined) {
      void dispatch(fetchGrammarRuleDetail(slug));
    }
  }, [slug, dispatch]);

  const handleNavigateToTopic = useCallback(
    (topic: string) => {
      const guessedSlug = topic.toLowerCase().replace(/\s+/g, '-');
      navigate(`/grammar-rules/${guessedSlug}`);
    },
    [navigate],
  );

  if (isLoading) {
    return <FullPageSpinner label="Loading grammar rule…" />;
  }

  if (error !== null) {
    return (
      <div className={styles['page']}>
        <button type="button" className={styles['backBtn']} onClick={handleBack}>
          <ArrowLeft size={16} /> Back to Grammar Rules
        </button>
        <div className={styles['errorState']}>
          <AlertCircle size={40} />
          <p className={styles['errorTitle']}>Couldn't load this rule</p>
          <p className={styles['errorMsg']}>{error}</p>
          <button type="button" className={styles['retryBtn']} onClick={handleRetry}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      </div>
    );
  }

  if (rule === null) {
    return null;
  }

  const accentColor = LEVEL_COLOR[rule.level] ?? '#6366f1';

  const tabCounts = useMemo<Record<TabKey, number>>(() => {
    if (!rule) return { overview: 0, usages: 0, mistakes: 0, compare: 0 };
    return {
      overview: (rule.coreConcept.length > 0 ? 1 : 0) + (rule.structure.length > 0 ? 1 : 0) + rule.signalWords.length,
      usages: rule.usages.length + rule.sections.length,
      mistakes: rule.commonMistakes.length,
      compare: rule.comparisons.length,
    };
  }, [rule]);

  return (
    <div className={styles['page']}>
      <button type="button" className={styles['backBtn']} onClick={handleBack}>
        <ArrowLeft size={15} /> Grammar Rules
      </button>

      <header
        className={styles['hero']}
        style={{ '--hero-accent': accentColor } as React.CSSProperties}
      >
        <div className={styles['heroAccentLine']} />
        <div className={styles['heroInner']}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <span
              className={styles['heroBadge']}
              style={{
                background: `${accentColor}1a`,
                color: accentColor,
                borderColor: `${accentColor}33`,
                margin: 0,
              }}
            >
              {LEVEL_DISPLAY[rule.level] ?? rule.level}
            </span>

            <BookmarkButton targetId={rule.id} type="GRAMMAR_RULE" size="md" label="Save Rule" />
          </div>

          <h1 className={styles['heroTitle']}>{rule.topic}</h1>
          {rule.summary.length > 0 && <p className={styles['heroSummary']}>{rule.summary}</p>}
        </div>
      </header>

      <div className={styles['body']}>
        <div className={styles['main']}>
          <div className={styles['tabBar']} role="tablist">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`${styles['tab']} ${activeTab === key ? styles['tabActive'] : ''}`}
                style={
                  activeTab === key
                    ? ({ '--tab-color': accentColor } as React.CSSProperties)
                    : undefined
                }
                onClick={() => {
                  setActiveTab(key);
                }}
              >
                {icon}
                {label}
                {tabCounts[key] > 0 && <span className={styles['tabCount']}>{tabCounts[key]}</span>}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <OverviewTab
              coreConcept={rule.coreConcept}
              structure={rule.structure}
              signalWords={rule.signalWords}
            />
          )}
          {activeTab === 'usages' && <UsagesTab usages={rule.usages} sections={rule.sections} />}
          {activeTab === 'mistakes' && <MistakesTab mistakes={rule.commonMistakes} />}
          {activeTab === 'compare' && (
            <CompareTab comparisons={rule.comparisons} onNavigate={handleNavigateToTopic} />
          )}
        </div>

        <Sidebar relatedTopics={rule.relatedTopics} onNavigate={handleNavigateToTopic} />
      </div>
    </div>
  );
}
