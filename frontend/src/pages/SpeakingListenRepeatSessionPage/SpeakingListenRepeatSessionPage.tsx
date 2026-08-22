import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, Volume2, X, RotateCcw, Trophy, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { resetSpeakingSession } from '@/store/Slices/SpeakingRepeatSlice';
import { useListenAndRepeatEngine } from '@/hooks/useListenAndRepeatEngine/useListenAndRepeatEngine';
import { RESPONSE_WINDOW_SEC } from '@/constants/speaking-constants';
import styles from './SpeakingListenRepeatSessionPage.module.css';

const LIST_PATH = '/speaking/listen-and-repeat';

function RadialTimer({ timeLeft, total }: { timeLeft: number; total: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / total;
  const offset = circumference * (1 - progress);

  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className={styles['radialTimer']}>
      <circle cx="65" cy="65" r={radius} className={styles['radialTrack']} />
      <circle
        cx="65"
        cy="65"
        r={radius}
        className={styles['radialProgress']}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text x="65" y="72" textAnchor="middle" className={styles['radialLabel']}>
        {timeLeft}
      </text>
    </svg>
  );
}

export default function SpeakingListenRepeatSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const sessionId = useAppSelector((s) => s.speakingRepeat.sessionId);
  const scenario = useAppSelector((s) => s.speakingRepeat.scenario);

  const engine = useListenAndRepeatEngine('');

  useEffect(() => {
    if (sessionId === null) {
      navigate(LIST_PATH, { replace: true });
    }
  }, [sessionId, navigate]);

  const handleExit = () => {
    if (window.confirm(t('speaking.session.exitConfirm'))) {
      dispatch(resetSpeakingSession());
      navigate(LIST_PATH, { replace: true });
    }
  };

  const handleFinishExit = () => {
    dispatch(resetSpeakingSession());
    navigate(LIST_PATH, { replace: true });
  };

  const handleUnlockAndBegin = () => {
    const unlock = new Audio();
    void unlock.play().catch(() => undefined);
    void engine.begin();
  };

  if (sessionId === null) {
    return null;
  }

  if (engine.phase === 'complete' && engine.review !== null) {
    const review = engine.review;

    return (
      <div className={styles['reviewPage']}>
        <div className={styles['reviewHeader']}>
          <Trophy size={40} className={styles['reviewTrophy']} />
          <h1 className={styles['reviewTitle']}>{t('speaking.session.review.title')}</h1>
          <div className={styles['reviewScoreRow']}>
            <div className={styles['reviewScoreBox']}>
              <span className={styles['reviewScoreVal']}>{review.taskScore?.toFixed(1) ?? '0.0'}</span>
              <span className={styles['reviewScoreLabel']}>{t('speaking.session.review.taskScore')}</span>
            </div>
            <div className={styles['reviewScoreBox']}>
              <span className={styles['reviewScoreVal']}>{review.finalScore ?? 0}%</span>
              <span className={styles['reviewScoreLabel']}>{t('speaking.session.review.overall')}</span>
            </div>
            <div className={styles['reviewScoreBox']}>
              <span className={styles['reviewScoreVal']}>+{review.xpEarned ?? 0}</span>
              <span className={styles['reviewScoreLabel']}>XP</span>
            </div>
          </div>
        </div>

        <div className={styles['reviewList']}>
          {review.results.map((result, index) => (
            <div key={result.itemId} className={styles['reviewItem']}>
              <div className={styles['reviewItemHead']}>
                <span className={styles['reviewItemNum']}>{index + 1}</span>
                <span className={styles['reviewItemScore']}>{result.itemScore.toFixed(1)} / 5.0</span>
              </div>
              <p className={styles['reviewReference']}>{result.referenceText}</p>
              <div className={styles['reviewWords']}>
                {result.wordScores.map((w, wi) => (
                  <span
                    key={wi}
                    className={styles['reviewWord']}
                    style={{
                      color:
                        w.accuracyScore >= 80
                          ? '#22c55e'
                          : w.accuracyScore >= 50
                            ? '#f59e0b'
                            : '#ef4444',
                    }}
                  >
                    {w.word}
                  </span>
                ))}
              </div>
              <audio
                controls
                className={styles['reviewAudio']}
                src={`data:${result.userAudioMimeType};base64,${result.userAudioBase64}`}
              />
            </div>
          ))}
        </div>

        <button type="button" className={styles['primaryBtn']} onClick={handleFinishExit}>
          {t('speaking.session.review.backToList')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles['page']}>
      <header className={styles['sessionHeader']}>
        <div className={styles['progressTrack']}>
          <div
            className={styles['progressFill']}
            style={{ width: `${(engine.currentIndex / Math.max(1, engine.totalItems)) * 100}%` }}
          />
        </div>
        <div className={styles['headerRow']}>
          <span className={styles['stepLabel']}>
            {engine.currentIndex + 1} / {engine.totalItems || 7}
          </span>
          <button type="button" className={styles['exitBtn']} onClick={handleExit} aria-label="Exit">
            <X size={18} />
          </button>
        </div>
      </header>

      <p className={styles['scenarioTag']}>{scenario}</p>

      <div className={styles['stage']}>
        {engine.phase === 'idle' && (
          <div className={styles['centerBlock']}>
            <Mic size={48} className={styles['idleIcon']} />
            <h2 className={styles['stageTitle']}>{t('speaking.session.idle.title')}</h2>
            <p className={styles['stageHint']}>{t('speaking.session.idle.hint')}</p>
            <button type="button" className={styles['primaryBtn']} onClick={handleUnlockAndBegin}>
              {t('speaking.session.idle.begin')}
            </button>
          </div>
        )}

        {engine.phase === 'requesting_mic' && (
          <div className={styles['centerBlock']}>
            <div className={styles['spinner']} />
            <p className={styles['stageHint']}>{t('speaking.session.requestingMic')}</p>
          </div>
        )}

        {engine.phase === 'get_ready' && (
          <div className={styles['centerBlock']}>
            <span className={styles['itemBadge']}>{engine.currentIndex + 1}</span>
            <p className={styles['stageHint']}>{t('speaking.session.getReady')}</p>
          </div>
        )}

        {engine.phase === 'loading_audio' && (
          <div className={styles['centerBlock']}>
            <div className={styles['spinner']} />
            <p className={styles['stageHint']}>{t('speaking.session.loadingAudio')}</p>
          </div>
        )}

        {engine.phase === 'playing' && (
          <div className={styles['centerBlock']}>
            <div className={styles['pulseCircle']}>
              <Volume2 size={40} />
            </div>
            <h2 className={styles['stageTitle']}>{t('speaking.session.listen')}</h2>
          </div>
        )}

        {(engine.phase === 'pausing' || engine.phase === 'beep') && (
          <div className={styles['centerBlock']}>
            <div className={styles['beepCircle']} />
            <p className={styles['stageHint']}>{t('speaking.session.getReadyToSpeak')}</p>
          </div>
        )}

        {engine.phase === 'recording' && (
          <div className={styles['centerBlock']}>
            <RadialTimer timeLeft={engine.timeLeft} total={RESPONSE_WINDOW_SEC} />
            <div className={styles['recordingDot']} />
            <h2 className={styles['stageTitle']}>{t('speaking.session.speakNow')}</h2>
          </div>
        )}

        {engine.phase === 'submitting' && (
          <div className={styles['centerBlock']}>
            <div className={styles['spinner']} />
            <p className={styles['stageHint']}>{t('speaking.session.processing')}</p>
          </div>
        )}

        {engine.phase === 'item_done' && (
          <div className={styles['centerBlock']}>
            <CheckCircle2 size={48} className={styles['doneIcon']} />
            <p className={styles['stageHint']}>{t('speaking.session.recorded')}</p>
          </div>
        )}

        {engine.phase === 'finishing' && (
          <div className={styles['centerBlock']}>
            <div className={styles['spinner']} />
            <p className={styles['stageHint']}>{t('speaking.session.finishing')}</p>
          </div>
        )}

        {engine.phase === 'error' && (
          <div className={styles['centerBlock']}>
            <AlertCircle size={44} className={styles['errorIcon']} />
            <h2 className={styles['stageTitle']}>
              {t(`speaking.session.errors.${engine.errorMessage ?? 'submit_failed'}`)}
            </h2>
            {engine.errorMessage !== 'quota_exceeded' && (
              <button type="button" className={styles['primaryBtn']} onClick={engine.retry}>
                <RotateCcw size={15} />
                {t('speaking.session.retry')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}