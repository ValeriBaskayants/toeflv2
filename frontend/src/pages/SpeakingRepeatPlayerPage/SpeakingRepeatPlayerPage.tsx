import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Mic, MicOff, Volume2, AlertCircle, RefreshCw,
  Trophy, CheckCircle2, Sparkles, Radio,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  fetchSpeakingSetById,
  startSpeakingSession,
  completeSpeakingSession,
  clearSpeakingPlayerState,
} from '@/store/Slices/SpeakingRepeatSlice';
import { speakingRepeatApi } from '@/api/services/speaking-repeat';
import { useSpeakingRepeatFlow } from '@/hooks/useSpeakingRepeatFlow/useSpeakingRepeatFlow';
import { useMicLevel } from '@/hooks/useMicLevel/useMicLevel';
import { MicLevelMeter } from '@/components/component/speaking/MicLevelMeter/MicLevelMeter';
import { InlineAudioPlayer } from '@/components/component/audio/InlineAudioPlayer';
import { FullPageSpinner } from '@/components/ui/Spinner';
import type { SpeakingDifficulty, SpeakingSessionReview } from '@/types/speaking/Speaking.types';
import styles from './SpeakingRepeatPlayerPage.module.css';

const LEVEL_DISPLAY: Record<string, string> = {
  A1: 'A1', A1_PLUS: 'A1+', A2: 'A2', A2_PLUS: 'A2+',
  B1: 'B1', B1_PLUS: 'B1+', B2: 'B2', B2_PLUS: 'B2+',
  C1: 'C1', C2: 'C2',
};

export default function SpeakingRepeatPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const {
    currentSet, setLoading, setError,
    activeSession, sessionLoading, sessionError,
    reviewSession, completing, completeError,
  } = useAppSelector((s) => s.speakingRepeat);

  const [completeTriggered, setCompleteTriggered] = useState(false);

  useEffect(() => {
    if (!id) return;
    void dispatch(fetchSpeakingSetById(id));
    return () => { dispatch(clearSpeakingPlayerState()); };
  }, [id, dispatch]);

  const fetchItemAudio = useCallback(
    async (itemId: string) => {
      if (!activeSession) throw new Error('No active session');
      const { data } = await speakingRepeatApi.getItemAudio(activeSession.session.id, itemId);
      return data;
    },
    [activeSession],
  );

  const submitAttempt = useCallback(
    async (itemId: string, blob: Blob, mimeType: string) => {
      if (!activeSession) throw new Error('No active session');
      return speakingRepeatApi.submitAttempt(activeSession.session.id, itemId, blob, mimeType);
    },
    [activeSession],
  );

  const handleAllDone = useCallback(() => {
    setCompleteTriggered(true);
  }, []);

  const flow = useSpeakingRepeatFlow({
    items: activeSession?.items ?? [],
    fetchItemAudio,
    submitAttempt,
    onAllDone: handleAllDone,
  });

  useEffect(() => {
    if (completeTriggered && activeSession) {
      setCompleteTriggered(false);
      void dispatch(completeSpeakingSession(activeSession.session.id));
    }
  }, [completeTriggered, activeSession, dispatch]);

  const micLevel = useMicLevel(flow.micStream, flow.phase === 'recording');

  const handleStart = async () => {
    if (!id) return;
    const result = await dispatch(startSpeakingSession(id));
    if (startSpeakingSession.fulfilled.match(result)) {
      flow.start();
    }
  };

  const handleRestart = () => {
    flow.reset();
    dispatch(clearSpeakingPlayerState());
    if (id) void dispatch(fetchSpeakingSetById(id));
  };

  const handleBack = () => {
    flow.reset();
    navigate('/speaking');
  };

  const isBrowserUnsupported =
    typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia;

  // ── Render: loading / error ────────────────────────────────────────────

  if (setLoading) return <FullPageSpinner label={t('speaking.repeat.loading')} />;

  if (setError !== null || currentSet === null) {
    return (
      <div className={styles['errorPage']}>
        <AlertCircle size={44} className={styles['errorIcon']} />
        <p>{setError ?? t('speaking.repeat.error')}</p>
        <button type="button" className={styles['backBtn']} onClick={handleBack}>
          <ArrowLeft size={15} /> {t('speaking.repeat.backToList')}
        </button>
      </div>
    );
  }

  const scenario = activeSession?.scenario ?? currentSet.scenario;
  const imageUrl = activeSession?.imageUrl ?? currentSet.imageUrl;

  return (
    <div className={styles['page']}>
      <div className={styles['pageHeader']}>
        <button type="button" className={styles['backLink']} onClick={handleBack}>
          <ArrowLeft size={16} /> {t('speaking.repeat.backToList')}
        </button>
        <span className={styles['levelBadge']}>{LEVEL_DISPLAY[currentSet.level] ?? currentSet.level}</span>
      </div>

      <h1 className={styles['title']}>{scenario}</h1>

      <div className={styles['layout']}>
        {imageUrl !== null && (
          <div className={styles['imagePanel']}>
            <img src={imageUrl} alt="" className={styles['scenarioImage']} />
          </div>
        )}

        <div className={styles['contentPanel']}>
          {/* ── Intro: до старта сессии ── */}
          {!activeSession && !reviewSession && (
            <div className={styles['intro']}>
              <h2 className={styles['introTitle']}>{t('speaking.repeat.intro.title')}</h2>
              <ul className={styles['introRules']}>
                <li>{t('speaking.repeat.intro.rule1', { count: currentSet.items.length })}</li>
                <li>{t('speaking.repeat.intro.rule2')}</li>
                <li>{t('speaking.repeat.intro.rule3')}</li>
                <li>{t('speaking.repeat.intro.rule4')}</li>
              </ul>

              {isBrowserUnsupported && (
                <div className={styles['warnBox']}>
                  <AlertCircle size={15} />
                  {t('speaking.repeat.unsupported')}
                </div>
              )}

              {sessionError !== null && (
                <div className={styles['warnBox']}>
                  <AlertCircle size={15} />
                  {sessionError}
                </div>
              )}

              <button
                type="button"
                className={styles['startBtn']}
                onClick={() => void handleStart()}
                disabled={sessionLoading || isBrowserUnsupported}
              >
                <Mic size={16} />
                {sessionLoading ? t('speaking.repeat.intro.starting') : t('speaking.repeat.intro.start')}
              </button>
            </div>
          )}

          {/* ── Активная сессия — не завершена и не сорвалась насмерть ── */}
          {activeSession && !reviewSession && flow.phase !== 'submit-failed' && (
            <ActiveFlow
              phase={flow.phase}
              currentIndex={flow.currentIndex}
              totalItems={activeSession.items.length}
              secondsLeft={flow.secondsLeft}
              recordingWindowSec={flow.currentItem?.recordingWindowSec ?? 0}
              difficulty={flow.currentItem?.difficulty}
              micLevel={micLevel}
              micErrorReason={flow.micErrorReason}
              onRetryMic={flow.start}
              onRetryAudio={flow.retryAudioLoad}
            />
          )}

          {/* ── Отправка не удалась после ретраев — только полный рестарт ── */}
          {activeSession && !reviewSession && flow.phase === 'submit-failed' && (
            <div className={styles['terminalError']}>
              <AlertCircle size={40} className={styles['errorIcon']} />
              <h3>{t('speaking.repeat.submitFailed.title')}</h3>
              <p>{t('speaking.repeat.submitFailed.hint')}</p>
              <button type="button" className={styles['startBtn']} onClick={handleRestart}>
                <RefreshCw size={15} /> {t('speaking.repeat.submitFailed.restart')}
              </button>
            </div>
          )}

          {/* ── Подсчёт результата ── */}
          {(completing || (flow.phase === 'all-done' && !reviewSession)) && (
            <div className={styles['finishing']}>
              <Sparkles size={28} className={styles['spin']} />
              <p>{t('speaking.repeat.finishing')}</p>
            </div>
          )}

          {completeError !== null && !reviewSession && (
            <div className={styles['terminalError']}>
              <AlertCircle size={40} className={styles['errorIcon']} />
              <p>{completeError}</p>
              <button type="button" className={styles['startBtn']} onClick={handleRestart}>
                <RefreshCw size={15} /> {t('speaking.repeat.submitFailed.restart')}
              </button>
            </div>
          )}

          {/* ── Результаты ── */}
          {reviewSession && (
            <ResultsView
              review={reviewSession}
              onPracticeAgain={handleRestart}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── ActiveFlow ─────────────────────────────────────────────────────────────

interface ActiveFlowProps {
  phase: ReturnType<typeof useSpeakingRepeatFlow>['phase'];
  currentIndex: number;
  totalItems: number;
  secondsLeft: number;
  recordingWindowSec: number;
  difficulty: SpeakingDifficulty | undefined;
  micLevel: number;
  micErrorReason: string | null;
  onRetryMic: () => void;
  onRetryAudio: () => void;
}

function ActiveFlow({
  phase, currentIndex, totalItems, secondsLeft, recordingWindowSec,
  micLevel, micErrorReason, onRetryMic, onRetryAudio,
}: ActiveFlowProps) {
  const { t } = useTranslation();

  if (phase === 'requesting-mic') {
    return (
      <div className={styles['centerState']}>
        <Mic size={40} className={styles['pulseIcon']} />
        <p>{t('speaking.repeat.mic.requesting')}</p>
      </div>
    );
  }

  if (phase === 'mic-denied') {
    const reasonKey = micErrorReason ?? 'unknown';
    return (
      <div className={styles['terminalError']}>
        <MicOff size={40} className={styles['errorIcon']} />
        <h3>{t('speaking.repeat.mic.deniedTitle')}</h3>
        <p>{t(`speaking.repeat.mic.reasons.${reasonKey}`)}</p>
        <button type="button" className={styles['startBtn']} onClick={onRetryMic}>
          <RefreshCw size={15} /> {t('speaking.repeat.retry')}
        </button>
      </div>
    );
  }

  if (phase === 'unsupported') {
    return (
      <div className={styles['terminalError']}>
        <AlertCircle size={40} className={styles['errorIcon']} />
        <p>{t('speaking.repeat.unsupported')}</p>
      </div>
    );
  }

  return (
    <div className={styles['itemChrome']}>
      <div className={styles['progressDots']} aria-label={`${currentIndex + 1} / ${totalItems}`}>
        {Array.from({ length: totalItems }).map((_, i) => (
          <span
            key={i}
            className={[
              styles['dot'],
              i < currentIndex ? styles['dotDone'] : '',
              i === currentIndex ? styles['dotActive'] : '',
            ].filter(Boolean).join(' ')}
          />
        ))}
      </div>
      <span className={styles['itemCounter']}>
        {t('speaking.repeat.itemOf', { current: currentIndex + 1, total: totalItems })}
      </span>

      {phase === 'loading-audio' && (
        <div className={styles['centerState']}>
          <Radio size={36} className={styles['spin']} />
          <p>{t('speaking.repeat.loading')}</p>
        </div>
      )}

      {phase === 'audio-error' && (
        <div className={styles['terminalError']}>
          <AlertCircle size={36} className={styles['errorIcon']} />
          <p>{t('speaking.repeat.audioError')}</p>
          <button type="button" className={styles['startBtn']} onClick={onRetryAudio}>
            <RefreshCw size={15} /> {t('speaking.repeat.retry')}
          </button>
        </div>
      )}

      {phase === 'playing-prompt' && (
        <div className={styles['centerState']}>
          <div className={styles['speakerPulse']}>
            <Volume2 size={32} />
          </div>
          <p>{t('speaking.repeat.listen')}</p>
        </div>
      )}

      {phase === 'pre-beep-pause' && (
        <div className={styles['centerState']}>
          <p className={styles['getReady']}>{t('speaking.repeat.getReady')}</p>
        </div>
      )}

      {phase === 'beep' && (
        <div className={styles['centerState']}>
          <div className={styles['beepFlash']} />
          <p className={styles['getReady']}>{t('speaking.repeat.speakNow')}</p>
        </div>
      )}

      {phase === 'recording' && (
        <div className={styles['recordingState']}>
          <div className={styles['recordingIndicator']}>
            <span className={styles['recDot']} />
            {t('speaking.repeat.recording')}
          </div>
          <CountdownRing secondsLeft={secondsLeft} totalSeconds={recordingWindowSec} />
          <MicLevelMeter level={micLevel} />
        </div>
      )}

      {phase === 'submitting' && (
        <div className={styles['centerState']}>
          <CheckCircle2 size={32} className={styles['spin']} />
          <p>{t('speaking.repeat.submitting')}</p>
        </div>
      )}
    </div>
  );
}

// ── CountdownRing ──────────────────────────────────────────────────────────

function CountdownRing({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const offset = circumference * (1 - progress);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={styles['ring']}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#ef4444" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} className={styles['ringProgress']}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className={styles['ringText']}>
        {secondsLeft}
      </text>
    </svg>
  );
}
interface ResultsViewProps {
  review: SpeakingSessionReview;
  onPracticeAgain: () => void;
  onBack: () => void;
}

function ResultsView({ review, onPracticeAgain, onBack }: ResultsViewProps) {
  const { t } = useTranslation();
  const sortedResults = [...review.results].sort(
    (a, b) => review.playedItemIds.indexOf(a.itemId) - review.playedItemIds.indexOf(b.itemId),
  );

  return (
    <div className={styles['results']}>
      <div className={styles['scoreCard']}>
        <div className={styles['scoreNum']}>
          {review.finalScore ?? 0}<span>%</span>
        </div>
        <p className={styles['scoreSub']}>
          {t('speaking.repeat.results.taskScore', { score: review.taskScore ?? 0 })}
        </p>
        <div className={styles['scoreStats']}>
          <div className={styles['scoreStat']}>
            <span className={styles['scoreStatVal']} style={{ color: '#f59e0b' }}>
              +{review.xpEarned ?? 0} XP
            </span>
            <span className={styles['scoreStatLabel']}>{t('speaking.repeat.results.xpEarned')}</span>
          </div>
          <div className={styles['scoreStat']}>
            <span className={styles['scoreStatVal']}>{sortedResults.length}</span>
            <span className={styles['scoreStatLabel']}>{t('speaking.repeat.results.itemsCompleted')}</span>
          </div>
        </div>
      </div>

      <div className={styles['itemResults']}>
        {sortedResults.map((result, i) => (
          <div key={result.itemId} className={styles['itemResultCard']}>
            <div className={styles['itemResultHeader']}>
              <span className={styles['itemResultNum']}>#{i + 1}</span>
              <span className={styles['itemResultScore']}>{result.itemScore.toFixed(1)} / 5</span>
            </div>

            <p className={styles['scoredText']}>
              {result.wordScores.length > 0
                ? result.wordScores.map((w, wi) => {
                  const tone = w.accuracyScore >= 80 ? 'good' : w.accuracyScore >= 50 ? 'ok' : 'poor';
                  return (
                    <span
                      key={wi}
                      className={`${styles['word']} ${styles[`word_${tone}`]}`}
                      title={`${Math.round(w.accuracyScore)}% · ${w.errorType}`}
                    >
                      {w.word}{' '}
                    </span>
                  );
                })
                : result.referenceText}
            </p>

            <p className={styles['recognizedText']}>
              {t('speaking.repeat.results.youSaid')}: <em>{result.recognizedText || '—'}</em>
            </p>

            <InlineAudioPlayer
              src={`data:${result.userAudioMimeType};base64,${result.userAudioBase64}`}
              label={t('speaking.repeat.results.playYourAnswer')}
            />
          </div>
        ))}
      </div>

      <div className={styles['resultsActions']}>
        <button type="button" className={styles['backBtn']} onClick={onBack}>
          <ArrowLeft size={16} /> {t('speaking.repeat.backToList')}
        </button>
        <button type="button" className={styles['startBtn']} onClick={onPracticeAgain}>
          <Trophy size={16} /> {t('speaking.repeat.results.practiceAgain')}
        </button>
      </div>
    </div>
  );
}