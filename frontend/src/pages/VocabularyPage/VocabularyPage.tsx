import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
import {
  BookOpen,
  Search,
  Layers,
  Volume2,
  ChevronRight,
  Flame,
  Trophy,
  RotateCcw,
  Star,
  Zap,
  Brain,
  Filter,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import {
  fetchFlashcards,
  fetchWordList,
  fetchVocabProgress,
  reviewWord as reviewWordThunk,
  selectFlashcards,
  selectFlashcardsStatus,
  selectFlashcardsError,
  selectWordList,
  selectWordListStatus,
  selectVocabProgress,
  selectReviewStatus,
  clearFlashcards,
} from '@/store/Slices/VocabularySlice';
import { BookmarkButton } from '@/components/layout/BookmarkButton/BookmarkButton';
import type { VocabularyWord, SM2Quality } from '@/types/vocabulary/Vocabulary';
import { Level, PartOfSpeech, WordLearningStatus } from '@/types/globalTypes';
import styles from './VocabularyPage.module.css';

const LEVEL_ORDER: Level[] = [
  Level.A1,
  Level.A1_PLUS,
  Level.A2,
  Level.A2_PLUS,
  Level.B1,
  Level.B1_PLUS,
  Level.B2,
  Level.B2_PLUS,
  Level.C1,
  Level.C2,
];

const LEVEL_DISPLAY: Record<Level, string> = {
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

const LEVEL_COLOR: Record<Level, string> = {
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

const POS_LABEL: Record<PartOfSpeech, string> = {
  NOUN: 'noun',
  VERB: 'verb',
  ADJECTIVE: 'adj',
  ADVERB: 'adv',
  PHRASE: 'phrase',
};

const STATUS_CONFIG: Record<WordLearningStatus, { label: string; color: string }> = {
  NEW: { label: 'New', color: '#6b7280' },
  LEARNING: { label: 'Learning', color: '#3b82f6' },
  REVIEW: { label: 'Review', color: '#f59e0b' },
  MASTERED: { label: 'Mastered', color: '#22c55e' },
};

const RATINGS: Array<{
  quality: SM2Quality;
  label: string;
  hint: string;
  color: string;
}> = [
  { quality: 0, label: 'Again', hint: '< 1 day', color: '#ef4444' },
  { quality: 2, label: 'Hard', hint: '~ 3 days', color: '#f59e0b' },
  { quality: 3, label: 'Good', hint: '~ 1 week', color: '#3b82f6' },
  { quality: 5, label: 'Easy', hint: '~ 2 weeks', color: '#22c55e' },
];

interface HintConfig {
  autoRevealMs: number | null;
  showRussian: boolean;
  showWordShape: boolean;
  hintTimerProgressShow: boolean;
}

function getHintConfig(userLevel: Level, wordLevel: Level): HintConfig {
  const uIdx = LEVEL_ORDER.indexOf(userLevel);
  const wIdx = LEVEL_ORDER.indexOf(wordLevel);
  const gap = wIdx - uIdx;

  if (uIdx <= 2) {
    return {
      autoRevealMs: 4000,
      showRussian: true,
      showWordShape: true,
      hintTimerProgressShow: true,
    };
  }

  if (uIdx <= 5) {
    return {
      autoRevealMs: gap > 1 ? 6000 : 10000,
      showRussian: gap > 2,
      showWordShape: gap >= 0,
      hintTimerProgressShow: true,
    };
  }

  return {
    autoRevealMs: gap > 3 ? 12000 : null,
    showRussian: false,
    showWordShape: gap > 2,
    hintTimerProgressShow: false,
  };
}

function buildWordShape(word: string): string {
  if (word.length <= 2) {
    return word;
  }
  const first = word[0] ?? '';
  const last = word[word.length - 1] ?? '';
  const blanks = '_'.repeat(word.length - 2);
  return `${first}${blanks}${last}  (${word.length} letters)`;
}

function LevelBadge({ level }: { level: Level }) {
  const color = LEVEL_COLOR[level] ?? '#6366f1';
  return (
    <span
      className={styles['badge']}
      style={{ background: `${color}1a`, color, borderColor: `${color}30` }}
    >
      {LEVEL_DISPLAY[level]}
    </span>
  );
}

function StatusBadge({ status }: { status: WordLearningStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={styles['statusBadge']}
      style={{ background: `${cfg.color}15`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function PosBadge({ type }: { type: PartOfSpeech }) {
  return <span className={styles['posBadge']}>{POS_LABEL[type] ?? type.toLowerCase()}</span>;
}

function ProgressHeader() {
  const progress = useAppSelector(selectVocabProgress);
  if (progress === null) {
    return null;
  }

  const learnedPct = progress.total > 0 ? Math.round((progress.learned / progress.total) * 100) : 0;

  return (
    <div className={styles['progressHeader']}>
      <div className={styles['progressStat']}>
        <Brain size={15} />
        <span>{progress.total.toLocaleString()}</span>
        <span className={styles['progressStatLabel']}>total words</span>
      </div>
      <div className={styles['progressStat']}>
        <Zap size={15} className={styles['iconBlue']} />
        <span className={styles['iconBlue']}>{progress.learned}</span>
        <span className={styles['progressStatLabel']}>learned</span>
      </div>
      <div className={styles['progressStat']}>
        <Trophy size={15} className={styles['iconGreen']} />
        <span className={styles['iconGreen']}>{progress.mastered}</span>
        <span className={styles['progressStatLabel']}>mastered</span>
      </div>
      {progress.dueToday > 0 && (
        <div className={`${styles['progressStat']} ${styles['dueStat']}`}>
          <Flame size={15} />
          <span>{progress.dueToday}</span>
          <span className={styles['progressStatLabel']}>due today</span>
        </div>
      )}
      <div className={styles['progressBarWrap']}>
        <div className={styles['progressBar']}>
          <div className={styles['progressBarFill']} style={{ width: `${learnedPct}%` }} />
        </div>
        <span className={styles['progressBarLabel']}>{learnedPct}%</span>
      </div>
    </div>
  );
}

interface FlashcardProps {
  word: VocabularyWord;
  status: WordLearningStatus;
  userLevel: Level;
  cardIndex: number;
  totalCards: number;
  onRate: (quality: SM2Quality) => void;
  isReviewing: boolean;
}

function FlashcardView({
  word,
  status,
  userLevel,
  cardIndex,
  totalCards,
  onRate,
  isReviewing,
}: FlashcardProps) {
  const [phase, setPhase] = useState<'question' | 'answer'>('question');
  const [hintVisible, setHintVisible] = useState(false);
  const [timerPct, setTimerPct] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRevealRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = getHintConfig(userLevel, word.level);

  useEffect(() => {
    setPhase('question');
    setHintVisible(false);
    setTimerPct(100);

    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }
    if (autoRevealRef.current !== null) {
      clearTimeout(autoRevealRef.current);
    }

    if (config.autoRevealMs !== null) {
      const totalMs = config.autoRevealMs;
      const stepMs = 100;
      const stepSize = (stepMs / totalMs) * 100;

      timerRef.current = setInterval(() => {
        setTimerPct((prev) => Math.max(0, prev - stepSize));
      }, stepMs);

      autoRevealRef.current = setTimeout(() => {
        setHintVisible(true);
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
        }
        setTimerPct(0);
      }, totalMs);
    }

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
      if (autoRevealRef.current !== null) {
        clearTimeout(autoRevealRef.current);
      }
    };
  }, [cardIndex]);

  const handleShowHint = useCallback(() => {
    setHintVisible(true);
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }
    if (autoRevealRef.current !== null) {
      clearTimeout(autoRevealRef.current);
    }
    setTimerPct(0);
  }, []);

  const handleReveal = useCallback(() => {
    setPhase('answer');
    setHintVisible(false);
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
    }
    if (autoRevealRef.current !== null) {
      clearTimeout(autoRevealRef.current);
    }
  }, []);

  const levelColor = LEVEL_COLOR[word.level] ?? '#6366f1';
  const isNew = status === WordLearningStatus.NEW;

  return (
    <div className={styles['cardWrap']}>
      {/* Card progress indicator */}
      <div className={styles['cardMeta']}>
        <span className={styles['cardCounter']}>
          {cardIndex + 1} / {totalCards}
        </span>
        <div className={styles['cardDots']}>
          {Array.from({ length: Math.min(totalCards, 8) }, (_, i) => (
            <div
              key={i}
              className={`${styles['cardDot']} ${i < cardIndex ? styles['cardDotDone'] : ''} ${i === cardIndex ? styles['cardDotCurrent'] : ''}`}
              style={i === cardIndex ? ({ background: levelColor } as CSSProperties) : undefined}
            />
          ))}
          {totalCards > 8 && <span className={styles['cardDotsMore']}>+{totalCards - 8}</span>}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* The card itself */}
      <div
        className={`${styles['card']} ${phase === 'answer' ? styles['cardRevealed'] : ''}`}
        style={{ '--level-color': levelColor } as CSSProperties}
      >
        {/* Card top bar */}
        <div className={styles['cardTopBar']}>
          <div className={styles['cardBadges']}>
            <LevelBadge level={word.level} />
            <PosBadge type={word.type} />
            {word.isIrregularVerb && <span className={styles['irregularBadge']}>irregular</span>}
          </div>
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <BookmarkButton targetId={word.id} type="VOCABULARY" size="sm" />
          </div>
        </div>

        {/* Word */}
        <div className={styles['wordArea']}>
          <h2 className={styles['wordText']}>{word.word}</h2>
          {word.pronunciation.length > 0 && (
            <div className={styles['pronunciation']}>
              <Volume2 size={13} />
              <span>/{word.pronunciation}/</span>
            </div>
          )}
        </div>

        {/* ── QUESTION PHASE ── */}
        {phase === 'question' && (
          <>
            {/* Auto-hint timer progress bar */}
            {config.hintTimerProgressShow && !hintVisible && config.autoRevealMs !== null && (
              <div className={styles['hintTimerBar']}>
                <div
                  className={styles['hintTimerFill']}
                  style={{
                    width: `${timerPct}%`,
                    transition: timerPct === 100 ? 'none' : 'width 0.1s linear',
                  }}
                />
              </div>
            )}

            {/* Hint section */}
            {hintVisible ? (
              <div className={styles['hintBox']}>
                {config.showWordShape && (
                  <p className={styles['hintShape']}>{buildWordShape(word.word)}</p>
                )}
                {config.showRussian && word.definitionRu.length > 0 && (
                  <p className={styles['hintRu']}>{word.definitionRu}</p>
                )}
              </div>
            ) : (
              !isNew &&
              config.autoRevealMs === null && (
                <button type="button" className={styles['hintBtn']} onClick={handleShowHint}>
                  💡 Show hint
                </button>
              )
            )}

            {/* Reveal answer button */}
            <button type="button" className={styles['revealBtn']} onClick={handleReveal}>
              Show Answer
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* ── ANSWER PHASE ── */}
        {phase === 'answer' && (
          <div className={styles['answerArea']}>
            {/* Definition */}
            <div className={styles['definitionBlock']}>
              <p className={styles['definition']}>{word.definition}</p>
              {config.showRussian && word.definitionRu.length > 0 && (
                <p className={styles['definitionRu']}>{word.definitionRu}</p>
              )}
            </div>

            {/* Word forms (verbs) */}
            {word.type === PartOfSpeech.VERB && word.forms !== undefined && (
              <div className={styles['formsBlock']}>
                {word.forms.past !== undefined && (
                  <span className={styles['formChip']}>
                    <span className={styles['formLabel']}>past</span> {word.forms.past}
                  </span>
                )}
                {word.forms.pastParticiple !== undefined && (
                  <span className={styles['formChip']}>
                    <span className={styles['formLabel']}>p.p.</span> {word.forms.pastParticiple}
                  </span>
                )}
                {word.forms.thirdPerson !== undefined && (
                  <span className={styles['formChip']}>
                    <span className={styles['formLabel']}>3rd</span> {word.forms.thirdPerson}
                  </span>
                )}
              </div>
            )}

            {/* Examples */}
            {word.examples.length > 0 && (
              <div className={styles['examplesBlock']}>
                {word.examples.slice(0, 2).map((ex, i) => (
                  <p key={i} className={styles['example']}>
                    "{ex}"
                  </p>
                ))}
              </div>
            )}

            {/* Synonyms / antonyms */}
            {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
              <div className={styles['relatedBlock']}>
                {word.synonyms.length > 0 && (
                  <div className={styles['relatedRow']}>
                    <span className={styles['relatedLabel']}>≈</span>
                    <span className={styles['relatedWords']}>
                      {word.synonyms.slice(0, 4).join(', ')}
                    </span>
                  </div>
                )}
                {word.antonyms.length > 0 && (
                  <div className={styles['relatedRow']}>
                    <span className={`${styles['relatedLabel']} ${styles['antonymLabel']}`}>≠</span>
                    <span className={styles['relatedWords']}>
                      {word.antonyms.slice(0, 4).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Rating buttons */}
            <div className={styles['ratingArea']}>
              <p className={styles['ratingPrompt']}>How well did you know this?</p>
              <div className={styles['ratingButtons']}>
                {RATINGS.map(({ quality, label, hint, color }) => (
                  <button
                    key={quality}
                    type="button"
                    disabled={isReviewing}
                    className={styles['ratingBtn']}
                    style={{ '--rating-color': color } as CSSProperties}
                    onClick={() => onRate(quality)}
                  >
                    <span className={styles['ratingLabel']}>{label}</span>
                    <span className={styles['ratingHint']}>{hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionComplete({ total, onRestart }: { total: number; onRestart: () => void }) {
  return (
    <div className={styles['sessionComplete']}>
      <div className={styles['completeIcon']}>🎉</div>
      <h2 className={styles['completeTitle']}>Session complete!</h2>
      <p className={styles['completeText']}>
        You reviewed {total} word{total !== 1 ? 's' : ''} today. Great work — keep the streak going!
      </p>
      <button type="button" className={styles['restartBtn']} onClick={onRestart}>
        <RotateCcw size={15} />
        Study more
      </button>
    </div>
  );
}

function StudyMode() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const flashcards = useAppSelector(selectFlashcards);
  const status = useAppSelector(selectFlashcardsStatus);
  const error = useAppSelector(selectFlashcardsError);
  const reviewStatus = useAppSelector(selectReviewStatus);

  const [cardIndex, setCardIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [justMastered, setJustMastered] = useState(false);

  const userLevel = (user?.currentLevel as Level | undefined) ?? Level.A1;

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchFlashcards({ limit: 20 }));
    }
  }, [status, dispatch]);

  const handleRate = useCallback(
    async (quality: SM2Quality) => {
      const current = flashcards[cardIndex];
      if (current === undefined) {
        return;
      }

      const result = await dispatch(reviewWordThunk({ wordId: current.word.id, quality }));

      if (reviewWordThunk.fulfilled.match(result)) {
        setJustMastered(result.payload.justMastered);
      }

      const next = cardIndex + 1;
      if (next >= flashcards.length) {
        setSessionDone(true);
      } else {
        setCardIndex(next);
        setJustMastered(false);
      }
    },
    [cardIndex, flashcards, dispatch],
  );

  const handleRestart = useCallback(() => {
    dispatch(clearFlashcards());
    setCardIndex(0);
    setSessionDone(false);
    setJustMastered(false);
  }, [dispatch]);

  if (status === 'loading') {
    return (
      <div className={styles['studyLoading']}>
        <div className={styles['loadingSpinner']} />
        <p>Loading your flashcards…</p>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={styles['studyError']}>
        <p>{error}</p>
        <button type="button" onClick={handleRestart}>
          Try again
        </button>
      </div>
    );
  }

  if (flashcards.length === 0 && status === 'success') {
    return (
      <div className={styles['allCaughtUp']}>
        <div className={styles['completeIcon']}>⭐</div>
        <h2 className={styles['completeTitle']}>All caught up!</h2>
        <p className={styles['completeText']}>
          No words are due for review right now. Come back later or browse the full dictionary.
        </p>
      </div>
    );
  }

  if (sessionDone) {
    return <SessionComplete total={flashcards.length} onRestart={handleRestart} />;
  }

  const current = flashcards[cardIndex];
  if (current === undefined) {
    return null;
  }

  const cardStatus = (current.progress?.status ?? WordLearningStatus.NEW) as WordLearningStatus;

  return (
    <div className={styles['studyWrap']}>
      {justMastered && (
        <div className={styles['masteredToast']}>
          <Star size={15} /> Word mastered! +XP
        </div>
      )}
      <FlashcardView
        word={current.word}
        status={cardStatus}
        userLevel={userLevel}
        cardIndex={cardIndex}
        totalCards={flashcards.length}
        onRate={handleRate}
        isReviewing={reviewStatus === 'loading'}
      />
    </div>
  );
}

function WordCard({ word }: { word: VocabularyWord }) {
  const [expanded, setExpanded] = useState(false);
  const color = LEVEL_COLOR[word.level as Level] ?? '#6366f1';

  return (
    <article
      className={`${styles['wordCard']} ${expanded ? styles['wordCardExpanded'] : ''}`}
      style={{ '--card-color': color } as CSSProperties}
      onClick={() => setExpanded((p) => !p)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setExpanded((p) => !p);
        }
      }}
    >
      <div className={styles['wordCardAccent']} />
      <div className={styles['wordCardMain']}>
        <div className={styles['wordCardLeft']}>
          <span className={styles['wordCardWord']}>{word.word}</span>
          {word.pronunciation.length > 0 && (
            <span className={styles['wordCardPron']}>/{word.pronunciation}/</span>
          )}
        </div>
        <div className={styles['wordCardRight']}>
          <LevelBadge level={word.level} />
          <PosBadge type={word.type} />
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <BookmarkButton targetId={word.id} type="VOCABULARY" size="sm" />
          </div>
        </div>
      </div>

      {expanded && (
        <div className={styles['wordCardDetails']}>
          <p className={styles['wordCardDef']}>{word.definition}</p>
          {word.definitionRu.length > 0 && (
            <p className={styles['wordCardDefRu']}>{word.definitionRu}</p>
          )}
          {word.examples.length > 0 && (
            <p className={styles['wordCardExample']}>"{word.examples[0]}"</p>
          )}
          {word.synonyms.length > 0 && (
            <p className={styles['wordCardSynonyms']}>≈ {word.synonyms.slice(0, 4).join(', ')}</p>
          )}
        </div>
      )}
    </article>
  );
}

function BrowseMode() {
  const dispatch = useAppDispatch();
  const wordList = useAppSelector(selectWordList);
  const wordListStatus = useAppSelector(selectWordListStatus);

  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<Level | null>(null);
  const [pos, setPos] = useState<PartOfSpeech | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = {
      limit: 100,
      ...(level !== null ? { level } : {}),
      ...(pos !== null ? { type: pos } : {}),
      ...(search.trim().length > 0 ? { search: search.trim() } : {}),
    };

    void dispatch(fetchWordList(params));
  }, [dispatch, level, pos, search]);

  return (
    <div className={styles['browseWrap']}>
      {/* Search + filters */}
      <div className={styles['browseToolbar']}>
        <div className={styles['searchBox']}>
          <Search size={15} className={styles['searchIcon']} />
          <input
            type="search"
            className={styles['searchInput']}
            placeholder="Search words…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.length > 0 && (
            <button type="button" className={styles['searchClear']} onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          className={`${styles['filterToggle']} ${showFilters ? styles['filterToggleActive'] : ''}`}
          onClick={() => setShowFilters((p) => !p)}
        >
          <Filter size={14} />
          Filters
          {(level !== null || pos !== null) && (
            <span className={styles['filterBadge']}>{[level, pos].filter(Boolean).length}</span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className={styles['filtersPanel']}>
          {/* Level pills */}
          <div className={styles['filterGroup']}>
            <span className={styles['filterGroupLabel']}>Level</span>
            <div className={styles['filterPills']}>
              <button
                type="button"
                className={`${styles['filterPill']} ${level === null ? styles['filterPillActive'] : ''}`}
                onClick={() => setLevel(null)}
              >
                All
              </button>
              {LEVEL_ORDER.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`${styles['filterPill']} ${level === l ? styles['filterPillActive'] : ''}`}
                  style={
                    level === l ? ({ '--pill-color': LEVEL_COLOR[l] } as CSSProperties) : undefined
                  }
                  onClick={() => setLevel(level === l ? null : l)}
                >
                  {LEVEL_DISPLAY[l]}
                </button>
              ))}
            </div>
          </div>

          {/* POS pills */}
          <div className={styles['filterGroup']}>
            <span className={styles['filterGroupLabel']}>Part of speech</span>
            <div className={styles['filterPills']}>
              <button
                type="button"
                className={`${styles['filterPill']} ${pos === null ? styles['filterPillActive'] : ''}`}
                onClick={() => setPos(null)}
              >
                All
              </button>
              {Object.values(PartOfSpeech).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles['filterPill']} ${pos === p ? styles['filterPillActive'] : ''}`}
                  onClick={() => setPos(pos === p ? null : p)}
                >
                  {POS_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Count */}
      {wordListStatus === 'success' && (
        <p className={styles['browseCount']}>
          {wordList.length} word{wordList.length !== 1 ? 's' : ''}
          {search.length > 0 ? ` matching "${search}"` : ''}
        </p>
      )}

      {/* List */}
      {wordListStatus === 'loading' ? (
        <div className={styles['browseLoading']}>
          <div className={styles['loadingSpinner']} />
        </div>
      ) : (
        <div className={styles['wordList']}>
          {wordList.length === 0 ? (
            <div className={styles['browseEmpty']}>
              <BookOpen size={32} />
              <p>No words found</p>
            </div>
          ) : (
            wordList.map((word) => <WordCard key={word.id} word={word} />)
          )}
        </div>
      )}
    </div>
  );
}

type PageMode = 'study' | 'browse';

export function VocabularyPage() {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<PageMode>('study');

  useEffect(() => {
    void dispatch(fetchVocabProgress());
  }, [dispatch]);

  return (
    <div className={styles['page']}>
      {/* Page header */}
      <header className={styles['pageHeader']}>
        <div className={styles['pageHeaderLeft']}>
          <div className={styles['pageIconWrap']}>
            <Layers size={20} />
          </div>
          <div>
            <h1 className={styles['pageTitle']}>Vocabulary</h1>
            <p className={styles['pageSubtitle']}>Spaced repetition · SM-2 algorithm</p>
          </div>
        </div>
      </header>

      {/* Progress overview */}
      <ProgressHeader />

      {/* Mode switcher */}
      <div className={styles['modeSwitcher']} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'study'}
          className={`${styles['modeTab']} ${mode === 'study' ? styles['modeTabActive'] : ''}`}
          onClick={() => setMode('study')}
        >
          <Brain size={15} />
          Study
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'browse'}
          className={`${styles['modeTab']} ${mode === 'browse' ? styles['modeTabActive'] : ''}`}
          onClick={() => setMode('browse')}
        >
          <BookOpen size={15} />
          Browse
        </button>
      </div>

      {/* Content */}
      <div className={styles['content']}>
        {mode === 'study' && <StudyMode />}
        {mode === 'browse' && <BrowseMode />}
      </div>
    </div>
  );
}
