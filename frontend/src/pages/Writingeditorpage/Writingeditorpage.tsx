import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BookOpen,
  AlignLeft,
  FileText,
  RefreshCw,
  Lightbulb,
  MessageSquare,
  Underline,
  Target,
  Brain,
  BarChart2,
  Info,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchPromptById,
  fetchSubmission,
  submitWriting,
  setDraftText,
  clearEditor,
} from '@/store/Slices/WritingSlice';
import type { WritingError, WritingAnalysis } from '@/types/writing/Writing.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './WritingeditorPage.module.css';



const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
  C1: 'C1', C2: 'C2',
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  SENTENCE: <AlignLeft size={15} />,
  PARAGRAPH: <FileText size={15} />,
  ESSAY: <BookOpen size={15} />,
};

const SCORE_COLOR = (s: number) => (s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444');

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 28;

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}



function ScoreRing({ score }: { score: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const color = SCORE_COLOR(score);
  const filled = (score / 100) * circ;

  return (
    <svg viewBox="0 0 100 100" className={styles['scoreRing']} aria-label={`Score: ${score}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 1s var(--ease-spring)' }}
      />
      <text x="50" y="47" textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="20" fontWeight="800" fontFamily="inherit">
        {Math.round(score)}
      </text>
      <text x="50" y="64" textAnchor="middle" fill="var(--text-3)" fontSize="9" fontFamily="inherit">
        / 100
      </text>
    </svg>
  );
}



interface ScoreBarProps {
  label: string;
  score: number;
  icon: React.ReactNode;
  weight?: string;
}

function ScoreBar({ label, score, icon, weight }: ScoreBarProps) {
  const color = SCORE_COLOR(score);
  return (
    <div className={styles['scoreBar']}>
      <div className={styles['scoreBarHeader']}>
        <span className={styles['scoreBarIcon']} style={{ color }}>{icon}</span>
        <span className={styles['scoreBarLabel']}>{label}</span>
        {weight && <span className={styles['scoreBarWeight']}>{weight}</span>}
        <span className={styles['scoreBarValue']} style={{ color }}>{Math.round(score)}</span>
      </div>
      <div className={styles['scoreBarTrack']}>
        <div
          className={styles['scoreBarFill']}
          style={{ width: `${score}%`, backgroundColor: color, transition: 'width 0.9s var(--ease-spring)' }}
        />
      </div>
    </div>
  );
}



interface HighlightedTextProps {
  text: string;
  errors: WritingError[];
}

function HighlightedText({ text, errors }: HighlightedTextProps) {
  const [tooltip, setTooltip] = useState<{ msg: string; reps: string[]; x: number; y: number } | null>(null);

  const sorted = useMemo(() => {
    const s = [...errors].sort((a, b) => a.offset - b.offset);
    const result: WritingError[] = [];
    let cursor = 0;
    for (const e of s) {
      if (e.offset >= cursor) { result.push(e); cursor = e.offset + e.length; }
    }
    return result;
  }, [errors]);

  const parts = useMemo(() => {
    const out: Array<{ text: string; error?: WritingError }> = [];
    let cursor = 0;
    for (const err of sorted) {
      if (err.offset > cursor) out.push({ text: text.slice(cursor, err.offset) });
      out.push({ text: text.slice(err.offset, err.offset + err.length), error: err });
      cursor = err.offset + err.length;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor) });
    return out;
  }, [text, sorted]);

  return (
    <div className={styles['highlightedText']}>
      {parts.map((part, i) =>
        part.error ? (
          <mark
            key={i}
            className={styles['errorMark']}
            onMouseEnter={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setTooltip({ msg: part.error!.message, reps: part.error!.replacements, x: rect.left, y: rect.bottom + window.scrollY + 4 });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            {part.text}
          </mark>
        ) : (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.text}</span>
        ),
      )}
      {tooltip !== null && (
        <div className={styles['errorTooltip']} style={{ position: 'fixed', left: tooltip.x, top: tooltip.y }}>
          <p className={styles['tooltipMsg']}>{tooltip.msg}</p>
          {tooltip.reps.length > 0 && (
            <div className={styles['tooltipReps']}>
              {tooltip.reps.map((r) => <span key={r} className={styles['tooltipRep']}>{r}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



interface AnalysisPanelProps {
  analysis: WritingAnalysis;
  text: string;
}

function AnalysisPanel({ analysis, text }: AnalysisPanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'scores' | 'errors' | 'text'>('scores');

  const metrics: ScoreBarProps[] = [
    { label: t('writing.analysis.grammar'),    score: analysis.grammarScore,    icon: <CheckCircle2 size={14} />, weight: '35%' },
    { label: t('writing.analysis.task'),       score: analysis.taskScore,       icon: <Target size={14} />,       weight: '30%' },
    { label: t('writing.analysis.vocabulary'), score: analysis.vocabularyScore, icon: <Brain size={14} />,        weight: '20%' },
    { label: t('writing.analysis.coherence'),  score: analysis.coherenceScore,  icon: <BarChart2 size={14} />,    weight: '15%' },
  ];

  return (
    <div className={styles['analysisPanel']}>
      <div className={styles['scoreHero']}>
        <div className={styles['scoreRingWrap']}>
          <ScoreRing score={analysis.overallScore} />
          <div className={styles['scoreHeroMeta']}>
            <span className={styles['scoreHeroLabel']}>{t('writing.analysis.overallScore')}</span>
            {analysis.detectedTone && (
              <span className={styles['toneBadge']}>
                <MessageSquare size={11} />
                {analysis.detectedTone}
              </span>
            )}
          </div>
        </div>
        <div className={styles['quickStats']}>
          <div className={styles['quickStat']}>
            <span className={styles['quickStatVal']}>{analysis.wordCount}</span>
            <span className={styles['quickStatLabel']}>{t('writing.words')}</span>
          </div>
          <div className={styles['quickStat']}>
            <span className={styles['quickStatVal']} style={{ color: analysis.errorCount > 0 ? '#ef4444' : '#22c55e' }}>
              {analysis.errorCount}
            </span>
            <span className={styles['quickStatLabel']}>{t('writing.analysis.errors')}</span>
          </div>
        </div>
      </div>

      <div className={styles['analysisTabs']}>
        {(['scores', 'errors', 'text'] as const).map((tb) => (
          <button
            key={tb}
            type="button"
            className={`${styles['analysisTab']} ${tab === tb ? styles['analysisTabActive'] : ''}`}
            onClick={() => setTab(tb)}
          >
            {t(`writing.analysis.tab.${tb}`)}
          </button>
        ))}
      </div>

      {tab === 'scores' && (
        <div className={styles['tabContent']}>
          <div className={styles['scoreBars']}>
            {metrics.map((m) => <ScoreBar key={m.label} {...m} />)}
          </div>
          {analysis.feedback && (
            <div className={styles['feedbackCard']}>
              <div className={styles['feedbackHeader']}>
                <Lightbulb size={15} className={styles['feedbackIcon']} />
                {t('writing.analysis.feedback')}
              </div>
              <p className={styles['feedbackText']}>{analysis.feedback}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'errors' && (
        <div className={styles['tabContent']}>
          {analysis.errors.length === 0 ? (
            <div className={styles['noErrors']}>
              <CheckCircle2 size={32} className={styles['noErrorsIcon']} />
              <p>{t('writing.analysis.noErrors')}</p>
            </div>
          ) : (
            <div className={styles['errorsList']}>
              {analysis.errors.map((err, i) => (
                <div key={i} className={styles['errorItem']}>
                  <div className={styles['errorItemHeader']}>
                    <Underline size={13} className={styles['errorItemIcon']} />
                    <span className={styles['errorItemMsg']}>{err.message}</span>
                  </div>
                  {err.context && <p className={styles['errorContext']}>"…{err.context}…"</p>}
                  {err.replacements.length > 0 && (
                    <div className={styles['errorReps']}>
                      <span className={styles['errorRepsLabel']}>{t('writing.analysis.suggestions')}:</span>
                      {err.replacements.map((r) => <span key={r} className={styles['errorRep']}>{r}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'text' && (
        <div className={styles['tabContent']}>
          <p className={styles['textTabHint']}>{t('writing.analysis.hoverErrors')}</p>
          <HighlightedText text={text} errors={analysis.errors} />
        </div>
      )}
    </div>
  );
}



function WordCountBar({ count, min, max }: { count: number; min: number; max: number }) {
  const { t } = useTranslation();
  const pct = Math.min(100, (count / max) * 100);
  const tooShort = count < Math.floor(min * 0.5);
  const belowMin = count < min && !tooShort;
  const inRange = count >= min && count <= max;
  const color = tooShort ? '#ef4444' : belowMin ? '#f59e0b' : inRange ? '#22c55e' : '#f59e0b';

  const label = tooShort
    ? t('writing.wordCount.tooShort', { min })
    : belowMin
      ? t('writing.wordCount.belowMin', { count, min })
      : inRange
        ? t('writing.wordCount.inRange', { count })
        : t('writing.wordCount.tooLong', { max });

  return (
    <div className={styles['wordCountBar']}>
      <div className={styles['wordCountTrack']}>
        <div className={styles['wordCountMarker']} style={{ left: `${(min / max) * 100}%` }} />
        <div className={styles['wordCountFill']} style={{ width: `${pct}%`, backgroundColor: color, transition: 'width .2s ease, background-color .3s ease' }} />
      </div>
      <div className={styles['wordCountMeta']}>
        <span className={styles['wordCountLabel']} style={{ color }}>{label}</span>
        <span className={styles['wordCountRange']}>{min}–{max} {t('writing.words')}</span>
      </div>
    </div>
  );
}



export default function WritingEditorPage() {
  const { promptId } = useParams<{ promptId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const {
    currentPrompt,
    promptLoading,
    promptError,
    draftText,
    submitting,
    submitError,
    pendingSubmissionId,
    currentSubmission,
    willCountForProgress,
    attemptNumber,
  } = useAppSelector((s) => s.writing);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!promptId) return;
    void dispatch(fetchPromptById(promptId));
    const subId = searchParams.get('submission');
    if (subId) void dispatch(fetchSubmission(subId));
    return () => {
      dispatch(clearEditor());
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [promptId, dispatch, searchParams]);

  useEffect(() => {
    if (!pendingSubmissionId) return;
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > POLL_MAX_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      const result = await dispatch(fetchSubmission(pendingSubmissionId));
      if (fetchSubmission.fulfilled.match(result) && result.payload.status !== 'PENDING') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pendingSubmissionId, dispatch]);

  const handleSubmit = useCallback(async () => {
    if (!promptId || draftText.trim().length === 0) return;
    await dispatch(submitWriting({ promptId, text: draftText.trim() }));
  }, [promptId, draftText, dispatch]);

  const handleReset = useCallback(() => {
    dispatch(clearEditor());
    if (promptId) void dispatch(fetchPromptById(promptId));
  }, [dispatch, promptId]);

  const wordCount = countWords(draftText);
  const minWords = currentPrompt?.minWords ?? 50;
  const maxWords = currentPrompt?.maxWords ?? 200;
  const canSubmit = wordCount >= Math.floor(minWords * 0.5) && !submitting;

  const isPending = pendingSubmissionId !== null || currentSubmission?.status === 'PENDING';
  const isAnalyzed = currentSubmission?.status === 'ANALYZED';
  const isError = currentSubmission?.status === 'ERROR';

  if (promptLoading) return <FullPageSpinner label={t('writing.loading')} />;

  if (promptError !== null || currentPrompt === null) {
    return (
      <div className={styles['errorPage']}>
        <AlertCircle size={44} className={styles['errorIcon']} />
        <p>{promptError ?? t('writing.error')}</p>
        <button type="button" className={styles['backBtn']} onClick={() => navigate('/writing')}>
          <ArrowLeft size={15} /> {t('writing.backToPrompts')}
        </button>
      </div>
    );
  }

  const typeColor =
    currentPrompt.type === 'SENTENCE' ? '#14b8a6' :
    currentPrompt.type === 'PARAGRAPH' ? '#6366f1' : '#ec4899';

  return (
    <div className={styles['page']}>
      <button type="button" className={styles['backLink']} onClick={() => navigate('/writing')}>
        <ArrowLeft size={15} />
        {t('writing.backToPrompts')}
      </button>

      <div className={styles['layout']}>
        {/* ── Левая панель — задание ── */}
        <aside className={styles['promptPanel']}>
          <div className={styles['promptPanelInner']}>
            <div className={styles['promptBadges']}>
              <span className={styles['levelBadge']}>{LEVEL_DISPLAY[currentPrompt.level] ?? currentPrompt.level}</span>
              <span className={styles['typeBadge']} style={{ '--type-color': typeColor } as React.CSSProperties}>
                {TYPE_ICON[currentPrompt.type]}
                {currentPrompt.type.charAt(0) + currentPrompt.type.slice(1).toLowerCase()}
              </span>
              {currentPrompt.topic && <span className={styles['topicTag']}>#{currentPrompt.topic}</span>}
            </div>

            <div className={styles['promptLabel']}>{t('writing.prompt')}</div>
            <blockquote className={styles['promptQuote']} style={{ borderColor: typeColor }}>
              {currentPrompt.prompt}
            </blockquote>

            {currentPrompt.instructions && (
              <div className={styles['instructionsCard']}>
                <div className={styles['instructionsHeader']}>
                  <Lightbulb size={14} style={{ color: '#f59e0b' }} />
                  {t('writing.instructions')}
                </div>
                <p className={styles['instructionsText']}>{currentPrompt.instructions}</p>
              </div>
            )}

            <div className={styles['wordTarget']}>
              <span className={styles['wordTargetLabel']}>{t('writing.target')}</span>
              <span className={styles['wordTargetVal']}>
                {currentPrompt.minWords}–{currentPrompt.maxWords} {t('writing.words')}
              </span>
            </div>
          </div>
        </aside>

        {/* ── Правая панель — редактор / результат ── */}
        <main className={styles['editorPanel']}>

          {/* Бейдж попытки — показывается до отправки */}
          {attemptNumber !== null && !isPending && !isAnalyzed && (
            <div className={styles['attemptInfo']}>
              {willCountForProgress === false ? (
                <div className={styles['attemptWarn']}>
                  <Info size={13} />
                  {t('writing.attempt.bonusOnly', { n: attemptNumber })}
                </div>
              ) : (
                <div className={styles['attemptBadge']}>
                  {t('writing.attempt.counted', { n: attemptNumber })}
                </div>
              )}
            </div>
          )}

          {!isPending && !isAnalyzed && !isError && (
            <>
              <div className={styles['editorHeader']}>
                <h2 className={styles['editorTitle']}>{t('writing.yourResponse')}</h2>
                {submitError && (
                  <span className={styles['submitError']}>
                    <AlertCircle size={13} /> {submitError}
                  </span>
                )}
              </div>

              <textarea
                className={styles['textarea']}
                value={draftText}
                onChange={(e) => dispatch(setDraftText(e.target.value))}
                placeholder={t('writing.placeholder')}
                spellCheck
                disabled={submitting}
                autoFocus
              />

              <WordCountBar count={wordCount} min={minWords} max={maxWords} />

              <button
                type="button"
                className={styles['submitBtn']}
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? (
                  <><Loader2 size={16} className={styles['spin']} />{t('writing.submitting')}</>
                ) : (
                  <><Send size={16} />{t('writing.submit')}</>
                )}
              </button>
            </>
          )}

          {isPending && (
            <div className={styles['pendingState']}>
              <div className={styles['pendingSpinner']}><Loader2 size={40} className={styles['spin']} /></div>
              <h3 className={styles['pendingTitle']}>{t('writing.analyzing')}</h3>
              <p className={styles['pendingHint']}>{t('writing.analyzingHint')}</p>
              {currentSubmission?.text && (
                <div className={styles['pendingPreview']}>
                  <div className={styles['pendingPreviewLabel']}>{t('writing.yourResponse')}</div>
                  <p className={styles['pendingPreviewText']}>{currentSubmission.text}</p>
                </div>
              )}
            </div>
          )}

          {isError && (
            <div className={styles['errorState']}>
              <XCircle size={40} className={styles['errorStateIcon']} />
              <h3>{t('writing.analysisError')}</h3>
              <p>{t('writing.analysisErrorHint')}</p>
              <button type="button" className={styles['resetBtn']} onClick={handleReset}>
                <RefreshCw size={14} /> {t('writing.tryAgain')}
              </button>
            </div>
          )}

          {isAnalyzed && currentSubmission?.analysis && (
            <>
              <div className={styles['analyzedHeader']}>
                <div className={styles['analyzedBadge']}>
                  <CheckCircle2 size={14} />
                  {t('writing.analyzed')}
                </div>
                <button type="button" className={styles['writeAgainBtn']} onClick={handleReset}>
                  <RefreshCw size={13} />
                  {t('writing.writeAgain')}
                </button>
              </div>
              <AnalysisPanel analysis={currentSubmission.analysis} text={currentSubmission.text} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}