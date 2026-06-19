import {
  useEffect,
  useCallback,
  useState,
  useRef,
  type KeyboardEvent,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  StickyNote,
  Trophy,
  ChevronDown,
  ChevronUp,
  Mic,
  BookOpen,
  Loader2,
  Headphones,
  Info,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchMaterialById,
  startSession,
  recordPlay,
  submitAnswer,
  saveNotes,
  completeSession,
  selectAnswer,
  addNote,
  removeNote,
  clearPlayerState,
} from '@/store/Slices/ListeningSlice';
import { useTTS } from '@/hooks/useTTS/useTTS';
import type { ListeningQuestion, ListeningNote } from '@/types/listening/Listening.types';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './ListeningplayerPage.module.css';
import type { Difficulty } from '@/types/globalTypes';



const RATE_OPTIONS = [
  { label: '0.75×', value: 0.75 },
  { label: '1.0×',  value: 1.0  },
  { label: '1.25×', value: 1.25 },
  { label: '1.5×',  value: 1.5  },
];

const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
  C1: 'C1', C2: 'C2',
};

type Phase = 'loading' | 'mode-select' | 'active' | 'completed' | 'error';



interface ModeSelectorProps {
  allowedModes: string[];
  onSelect: (mode: 'EASY' | 'MEDIUM' | 'HARD') => void;
  isLoading: boolean;
}

const MODE_CARDS = [
  {
    mode: 'EASY' as const,
    color: '#22c55e',
    bg: 'rgba(34,197,94,.08)',
    border: 'rgba(34,197,94,.3)',
    playsLabel: '∞ plays',
    xpLabel: '×0.7 XP',
    desc: 'Transcript visible. Replay as many times as you need.',
  },
  {
    mode: 'MEDIUM' as const,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,.08)',
    border: 'rgba(245,158,11,.3)',
    playsLabel: '3 plays',
    xpLabel: '×1.0 XP',
    desc: 'No transcript during playback. Revealed on completion.',
  },
  {
    mode: 'HARD' as const,
    color: '#ef4444',
    bg: 'rgba(239,68,68,.08)',
    border: 'rgba(239,68,68,.3)',
    playsLabel: '1 play',
    xpLabel: '×1.3 XP',
    desc: 'One chance only. Maximum XP reward.',
  },
];

function ModeSelector({ allowedModes, onSelect, isLoading }: ModeSelectorProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className={styles['modeSelector']}>
      <h2 className={styles['modeSelectorTitle']}>{t('listening.modeSelect.title')}</h2>
      <p className={styles['modeSelectorSub']}>{t('listening.modeSelect.subtitle')}</p>

      <div className={styles['modeCards']}>
        {MODE_CARDS.filter((c) => allowedModes.includes(c.mode)).map((card) => (
          <button
            key={card.mode}
            type="button"
            disabled={isLoading}
            className={`${styles['modeCard']} ${hovered === card.mode ? styles['modeCardHovered'] : ''}`}
            style={{
              '--m-color':  card.color,
              '--m-bg':     card.bg,
              '--m-border': card.border,
            } as React.CSSProperties}
            onMouseEnter={() => setHovered(card.mode)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(card.mode)}
          >
            <div className={styles['modeCardIcon']}>
              {card.mode === 'EASY'   && <Volume2 size={22} />}
              {card.mode === 'MEDIUM' && <Headphones size={22} />}
              {card.mode === 'HARD'   && <Zap size={22} />}
            </div>
            <div className={styles['modeCardLabel']}>{card.mode.charAt(0) + card.mode.slice(1).toLowerCase()}</div>
            <div className={styles['modeCardMeta']}>
              <span className={styles['modeCardPlays']}>{card.playsLabel}</span>
              <span className={styles['modeCardXp']}>{card.xpLabel}</span>
            </div>
            <p className={styles['modeCardDesc']}>{card.desc}</p>
            {isLoading && hovered === card.mode && (
              <Loader2 size={16} className={styles['spin']} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}



interface PlayerControlsProps {
  isPlaying: boolean;
  hasEnded: boolean;
  playCount: number;
  maxAllowedPlays: number;
  mode: string;
  voiceQuality: string;
  voiceName: string;
  currentRate: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onRateChange: (r: number) => void;
  canPlay: boolean;
}

function PlayerControls({
  isPlaying, playCount, maxAllowedPlays, mode,
  voiceQuality, voiceName, currentRate,
  onPlay, onPause, onRestart, onRateChange, canPlay,
}: PlayerControlsProps) {
  const { t } = useTranslation();

  

  const playsUsed = maxAllowedPlays >= 99
    ? `${playCount}`
    : `${playCount} / ${maxAllowedPlays}`;

  return (
    <div className={styles['playerControls']}>
      {/* Main controls */}
      <div className={styles['controlsRow']}>
        {/* Restart */}
        <button
          type="button"
          className={styles['ctrlBtn']}
          onClick={onRestart}
          disabled={!canPlay || playCount === 0}
          title={t('listening.player.restart')}
        >
          <RotateCcw size={18} />
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          className={`${styles['playBtn']} ${!canPlay ? styles['playBtnDisabled'] : ''}`}
          onClick={isPlaying ? onPause : onPlay}
          disabled={!canPlay}
        >
          {isPlaying
            ? <Pause size={24} />
            : <Play size={24} style={{ marginLeft: 2 }} />
          }
        </button>

        {/* Rate */}
        <div className={styles['rateGroup']}>
          {RATE_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={`${styles['rateBtn']} ${Math.abs(currentRate - value) < 0.01 ? styles['rateBtnActive'] : ''}`}
              onClick={() => onRateChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Play count */}
      <div className={styles['playMeta']}>
        <span className={styles['playCountBadge']} data-mode={mode}>
          {mode === 'EASY' ? `${playCount} plays` : `${playsUsed} plays`}
        </span>

        {/* Voice quality indicator */}
        <span
          className={`${styles['voiceQuality']} ${styles[`voiceQ${voiceQuality}`]}`}
          title={voiceName || 'No voice selected'}
        >
          <Volume2 size={11} />
          {voiceQuality === 'premium'  && t('listening.player.voicePremium')}
          {voiceQuality === 'standard' && t('listening.player.voiceStandard')}
          {voiceQuality === 'basic'    && t('listening.player.voiceBasic')}
          {voiceQuality === 'none'     && t('listening.player.voiceNone')}
        </span>

        {!canPlay && maxAllowedPlays < 99 && (
          <span className={styles['playsExhausted']}>
            <AlertCircle size={12} />
            {t('listening.player.noPlaysLeft')}
          </span>
        )}
      </div>
    </div>
  );
}



interface TranscriptViewProps {
  segments: Array<{ index: number; text: string; speaker?: string }>;
  activeSegmentIdx: number;
  visible: boolean;
}

function TranscriptView({ segments, activeSegmentIdx, visible }: TranscriptViewProps) {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSegmentIdx]);

  if (!visible) {
    return (
      <div className={styles['transcriptHidden']}>
        <Info size={15} />
        <span>{t('listening.player.transcriptHidden')}</span>
      </div>
    );
  }

  return (
    <div className={styles['transcript']}>
      <div className={styles['transcriptLabel']}>{t('listening.player.transcript')}</div>
      <div className={styles['transcriptSegments']}>
        {segments.map((seg, i) => (
          <div
            key={seg.index}
            ref={i === activeSegmentIdx ? activeRef : undefined}
            className={[
              styles['segment'],
              i === activeSegmentIdx ? styles['segmentActive'] : '',
              i < activeSegmentIdx  ? styles['segmentDone']   : '',
            ].filter(Boolean).join(' ')}
          >
            {seg.speaker && (
              <span className={styles['segmentSpeaker']}>{seg.speaker}</span>
            )}
            <span className={styles['segmentText']}>{seg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}



interface QuestionCardProps {
  question: ListeningQuestion;
  qIndex: number;
  sessionId: string;
}

function QuestionCard({ question, qIndex, sessionId }: QuestionCardProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { answers } = useAppSelector((state) => state.listening);
  const record = answers[question.id];

  const isSubmitted = record?.submitted === true;
  const isSubmitting = record?.submitting === true;
  const selectedIdx = record?.selectedIndex;

  const handleSelect = (idx: number) => {
    if (isSubmitted || isSubmitting) return;
    dispatch(selectAnswer({ questionId: question.id, selectedIndex: idx }));

    
    void dispatch(
      submitAnswer({
        sessionId,
        questionId: question.id,
        selectedIndex: idx,
      }),
    );
  };

  return (
    <div className={`${styles['qCard']} ${isSubmitted ? styles['qCardSubmitted'] : ''}`}>
      <div className={styles['qHeader']}>
        <span className={styles['qNum']}>Q{qIndex + 1}</span>
        {isSubmitting && <Loader2 size={13} className={styles['spin']} />}
        {isSubmitted && record.isCorrect  && <CheckCircle2 size={15} className={styles['qCorrectIcon']} />}
        {isSubmitted && !record.isCorrect && <XCircle      size={15} className={styles['qWrongIcon']}   />}
      </div>

      <p className={styles['qText']}>{question.question}</p>

      <div className={styles['qOptions']}>
        {question.options.map((opt, i) => {
          const isSelected  = selectedIdx === i;
          const isCorrectOp = isSubmitted && i === question.correctIndex;
          const isWrongOp   = isSubmitted && isSelected && !record.isCorrect;

          return (
            <button
              key={i}
              type="button"
              disabled={isSubmitted || isSubmitting}
              onClick={() => handleSelect(i)}
              className={[
                styles['qOption'],
                isSelected && !isSubmitted ? styles['qOptionSelected'] : '',
                isCorrectOp               ? styles['qOptionCorrect']   : '',
                isWrongOp                 ? styles['qOptionWrong']     : '',
              ].filter(Boolean).join(' ')}
            >
              <span className={styles['qOptionLetter']}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className={styles['qOptionText']}>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation after submit */}
      {isSubmitted && question.explanation && (
        <div className={`${styles['qExplanation']} ${record.isCorrect ? styles['qExplCorrect'] : styles['qExplWrong']}`}>
          <span className={styles['qExplLabel']}>{t('listening.questions.why')}</span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}



interface NotesPanelProps {
  sessionId: string;
  currentAudioSec?: number;
}

function NotesPanel({ sessionId, currentAudioSec }: NotesPanelProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { notes, notesSaving } = useAppSelector((state) => state.listening);
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    const text = draft.trim();
    if (!text) return;
    const note: ListeningNote = {
      id: uuidv4(),
      text,
      anchorSec: currentAudioSec,
      createdAt: new Date().toISOString(),
    };
    dispatch(addNote(note));
    setDraft('');
    
    void dispatch(saveNotes({ sessionId, notes: [note, ...notes] }));
  };

  const handleRemove = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    dispatch(removeNote(id));
    void dispatch(saveNotes({ sessionId, notes: updated }));
  };

  return (
    <div className={styles['notesPanel']}>
      <button
        type="button"
        className={styles['notesToggle']}
        onClick={() => setIsOpen((o) => !o)}
      >
        <StickyNote size={15} />
        <span>{t('listening.notes.label')} {notes.length > 0 && `(${notes.length})`}</span>
        {notesSaving && <Loader2 size={12} className={styles['spin']} />}
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className={styles['notesBody']}>
          <div className={styles['notesInputRow']}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('listening.notes.placeholder')}
              className={styles['notesTextarea']}
              rows={2}
              onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd();
              }}
            />
            <button
              type="button"
              className={styles['notesAddBtn']}
              onClick={handleAdd}
              disabled={!draft.trim()}
            >
              {t('listening.notes.add')}
            </button>
          </div>

          {notes.length === 0 && (
            <p className={styles['notesEmpty']}>{t('listening.notes.empty')}</p>
          )}

          <div className={styles['notesList']}>
            {notes.map((note) => (
              <div key={note.id} className={styles['noteItem']}>
                {note.anchorSec !== undefined && (
                  <span className={styles['noteAnchor']}>
                    {Math.floor(note.anchorSec / 60)}:{String(Math.floor(note.anchorSec % 60)).padStart(2, '0')}
                  </span>
                )}
                <p className={styles['noteText']}>{note.text}</p>
                <button
                  type="button"
                  className={styles['noteRemove']}
                  onClick={() => handleRemove(note.id)}
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



interface ResultsViewProps {
  result: NonNullable<ReturnType<typeof useAppSelector<any>>>;
  questions: ListeningQuestion[];
  onBack: () => void;
}

function ResultsView({ result, questions, onBack }: ResultsViewProps) {
  const { t } = useTranslation();
  const { answers } = useAppSelector((state) => state.listening);
  const [showTranscript, setShowTranscript] = useState(false);

  const allCorrect = result.correctCount === result.totalCount;

  return (
    <div className={styles['results']}>
      {/* Score card */}
      <div className={`${styles['scoreCard']} ${allCorrect ? styles['scoreCardPerfect'] : ''}`}>
        <div className={styles['scoreNum']}>{result.finalScore}<span>%</span></div>
        <div className={styles['scoreSub']}>
          {t('listening.results.finalScore')} · {result.mode.charAt(0) + result.mode.slice(1).toLowerCase()} mode
        </div>

        <div className={styles['scoreStats']}>
          <div className={styles['scoreStat']}>
            <span className={styles['scoreStatVal']}>{result.rawAccuracy}%</span>
            <span className={styles['scoreStatLabel']}>{t('listening.results.accuracy')}</span>
          </div>
          <div className={styles['scoreStat']}>
            <span className={styles['scoreStatVal']} style={{ color: '#f59e0b' }}>
              +{result.xpEarned} XP
            </span>
            <span className={styles['scoreStatLabel']}>{t('listening.results.xpEarned')}</span>
          </div>
          <div className={styles['scoreStat']}>
            <span className={styles['scoreStatVal']}>
              {result.correctCount}/{result.totalCount}
            </span>
            <span className={styles['scoreStatLabel']}>{t('listening.results.correct')}</span>
          </div>
        </div>
      </div>

      {/* Per-question breakdown */}
      {questions.length > 0 && (
        <div className={styles['resultsQuestions']}>
          <h3 className={styles['resultsQTitle']}>{t('listening.results.questions')}</h3>
          {questions.map((q, i) => {
            const ans = answers[q.id];
            const isCorrect = ans?.isCorrect;
            return (
              <div key={q.id} className={styles['resultQRow']}>
                <div className={styles['resultQMeta']}>
                  {isCorrect
                    ? <CheckCircle2 size={15} className={styles['qCorrectIcon']} />
                    : <XCircle      size={15} className={styles['qWrongIcon']} />}
                  <span className={styles['resultQNum']}>Q{i + 1}</span>
                </div>
                <div>
                  <p className={styles['resultQText']}>{q.question}</p>
                  {ans && !isCorrect && (
                    <p className={styles['resultQAnswers']}>
                      <span className={styles['resultQWrong']}>{q.options[ans.selectedIndex]}</span>
                      <span className={styles['resultQArrow']}> → </span>
                      <span className={styles['resultQCorrect']}>{q.options[q.correctIndex]}</span>
                    </p>
                  )}
                  {isCorrect && (
                    <p className={styles['resultQCorrectText']}>{q.options[q.correctIndex]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transcript reveal */}
      {result.transcript && (
        <div className={styles['transcriptReveal']}>
          <button
            type="button"
            className={styles['transcriptRevealBtn']}
            onClick={() => setShowTranscript((v) => !v)}
          >
            <BookOpen size={15} />
            {t('listening.results.showTranscript')}
            {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showTranscript && (
            <div className={styles['transcriptRevealText']}>{result.transcript}</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles['resultsActions']}>
        <button type="button" className={styles['backBtn']} onClick={onBack}>
          <ArrowLeft size={16} />
          {t('listening.results.backToLibrary')}
        </button>
      </div>
    </div>
  );
}



export default function ListeningPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const {
    currentMaterial,
    materialLoading,
    materialError,
    activeSession,
    sessionLoading,
    sessionError,
    playCount,
    maxAllowedPlays,
    completing,
    completeError,
    sessionResult,
    answers,
  } = useAppSelector((state) => state.listening);

  const [phase, setPhase] = useState<Phase>('loading');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [rateMultiplier, setRateMultiplier] = useState(1.0);

  
  useEffect(() => {
    if (!id) return;
    void dispatch(fetchMaterialById(id));
    return () => { dispatch(clearPlayerState()); };
  }, [id, dispatch]);

  
  useEffect(() => {
    if (materialLoading) { setPhase('loading'); return; }
    if (materialError)   { setPhase('error');   return; }
    if (sessionResult)   { setPhase('completed'); return; }
    if (activeSession)   { setPhase('active');   return; }
    if (currentMaterial) { setPhase('mode-select'); return; }
  }, [materialLoading, materialError, currentMaterial, activeSession, sessionResult]);

  
  const baseRate = currentMaterial?.recommendedRate ?? 1.0;
  const effectiveRate = baseRate * rateMultiplier;
  const canShowTranscript =
    currentMaterial !== null &&
    (activeSession?.mode === 'EASY' || phase === 'completed');

  const tts = useTTS({
    segments: currentMaterial?.segments ?? [],
    rate: effectiveRate,
    pitch: currentMaterial?.speakerPitch ?? 1.0,
    lang: currentMaterial?.speakerLang ?? 'en-US',
    fullText: '',
    materialId: ''
  });

  
  useEffect(() => {
    if (tts.hasEnded) setHasPlayed(true);
  }, [tts.hasEnded]);

  
  const handleModeSelect = async (mode:Difficulty | any) => {
    if (!id) return;
    await dispatch(startSession({ materialId: id, mode }));
  };

  const handlePlay = useCallback(async () => {
    if (!activeSession) return;
    const playsLeft = maxAllowedPlays >= 99 ? Infinity : maxAllowedPlays - playCount;
    if (playsLeft <= 0) return;

    
    await dispatch(recordPlay(activeSession.id));
    tts.play();
  }, [activeSession, maxAllowedPlays, playCount, dispatch, tts]);

  const handleRestart = useCallback(async () => {
    if (!activeSession) return;
    const playsLeft = maxAllowedPlays >= 99 ? Infinity : maxAllowedPlays - playCount;
    if (playsLeft <= 0) return;
    await dispatch(recordPlay(activeSession.id));
    tts.restart();
  }, [activeSession, maxAllowedPlays, playCount, dispatch, tts]);

  const handleRateChange = useCallback((multiplier: number) => {
    setRateMultiplier(multiplier);
    tts.setRate(baseRate * multiplier);
  }, [tts, baseRate]);

  const handleComplete = async () => {
    if (!activeSession) return;
    tts.stop();
    await dispatch(completeSession(activeSession.id));
  };

  const handleBack = () => {
    tts.stop();
    navigate('/listening');
  };

  
  const questions: ListeningQuestion[] = currentMaterial?.questions ?? [];
  const answeredCount = Object.values(answers).filter((a) => a.submitted).length;
  const canComplete =
    activeSession !== null &&
    (hasPlayed || playCount > 0) &&
    !completing;
  const canPlay =
    activeSession !== null &&
    (maxAllowedPlays >= 99 || playCount < maxAllowedPlays);

  

  if (phase === 'loading') return <FullPageSpinner label={t('listening.loading')} />;

  if (phase === 'error') {
    return (
      <div className={styles['errorPage']}>
        <AlertCircle size={48} className={styles['errorIcon']} />
        <p className={styles['errorText']}>{materialError ?? t('listening.error')}</p>
        <button type="button" className={styles['backBtn']} onClick={handleBack}>
          <ArrowLeft size={15} />
          {t('listening.player.backToList')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles['page']}>
      {/* ── Page header ── */}
      <div className={styles['pageHeader']}>
        <button type="button" className={styles['backLink']} onClick={handleBack}>
          <ArrowLeft size={16} />
          {t('listening.player.backToList')}
        </button>

        {currentMaterial && (
          <div className={styles['materialMeta']}>
            <span className={styles['levelBadge']}>
              {LEVEL_DISPLAY[currentMaterial.level] ?? currentMaterial.level}
            </span>
            <span className={styles['typeBadge']}>
              {currentMaterial.type === 'LECTURE'
                ? <><BookOpen size={11} /> {t('listening.type.lecture')}</>
                : <><Mic size={11} /> {t('listening.type.conversation')}</>}
            </span>
            {activeSession && (
              <span className={`${styles['modeBadge']} ${styles[`mode${activeSession.mode}`]}`}>
                {activeSession.mode}
              </span>
            )}
          </div>
        )}
      </div>

      {currentMaterial && (
        <h1 className={styles['materialTitle']}>{currentMaterial.title}</h1>
      )}

      {/* ── Session error ── */}
      {sessionError && (
        <div className={styles['sessionError']}>
          <AlertCircle size={14} />
          <span>{sessionError}</span>
          <button type="button" onClick={() => navigate('/listening')}>
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {/* ── PHASE: mode-select ── */}
      {phase === 'mode-select' && currentMaterial && (
        <ModeSelector
          allowedModes={currentMaterial.allowedModes}
          onSelect={handleModeSelect}
          isLoading={sessionLoading}
        />
      )}

      {/* ── PHASE: active ── */}
      {phase === 'active' && activeSession && currentMaterial && (
        <div className={styles['playerLayout']}>
          {/* Left: Player + Transcript */}
          <div className={styles['playerMain']}>
            {/* TTS quality warning */}
            {tts.voiceQuality === 'basic' && (
              <div className={styles['qualityWarn']}>
                <Info size={13} />
                {t('listening.player.voiceWarnBasic')}
              </div>
            )}
            {!tts.isSupported && (
              <div className={styles['qualityWarn']}>
                <AlertCircle size={13} />
                {t('listening.player.ttsNotSupported')}
              </div>
            )}

            {/* Player */}
            <PlayerControls
              isPlaying={tts.isPlaying}
              hasEnded={tts.hasEnded}
              playCount={playCount}
              maxAllowedPlays={maxAllowedPlays}
              mode={activeSession.mode}
              voiceQuality={tts.voiceQuality}
              voiceName={tts.voiceName}
              currentRate={rateMultiplier}
              onPlay={handlePlay}
              onPause={tts.pause}
              onRestart={handleRestart}
              onRateChange={handleRateChange}
              canPlay={canPlay}
            />

            {/* Transcript */}
            <TranscriptView
              segments={currentMaterial.segments}
              activeSegmentIdx={tts.activeSegmentIdx}
              visible={canShowTranscript}
            />

            {/* Notes */}
            <NotesPanel
              sessionId={activeSession.id}
            />
          </div>

          {/* Right: Questions */}
          <div className={styles['questionsPanel']}>
            <div className={styles['questionsPanelHeader']}>
              <h2 className={styles['questionsPanelTitle']}>
                {t('listening.questions.title')}
              </h2>
              <span className={styles['questionsProgress']}>
                {answeredCount}/{questions.length}
              </span>
            </div>

            {!hasPlayed && playCount === 0 ? (
              <div className={styles['questionsHint']}>
                <Headphones size={28} className={styles['questionsHintIcon']} />
                <p>{t('listening.questions.listenFirst')}</p>
              </div>
            ) : (
              <>
                <div className={styles['questionsList']}>
                  {questions.map((q, i) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      qIndex={i}
                      sessionId={activeSession.id}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className={styles['completeBtn']}
                  onClick={handleComplete}
                  disabled={!canComplete || completing}
                >
                  {completing
                    ? <><Loader2 size={15} className={styles['spin']} /> {t('listening.player.completing')}</>
                    : <><Trophy size={15} /> {t('listening.player.complete')}</>}
                </button>

                {completeError && (
                  <p className={styles['completeError']}>{completeError}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PHASE: completed ── */}
      {phase === 'completed' && sessionResult && currentMaterial && (
        <ResultsView
          result={sessionResult}
          questions={questions}
          onBack={handleBack}
        />
      )}
    </div>
  );
}