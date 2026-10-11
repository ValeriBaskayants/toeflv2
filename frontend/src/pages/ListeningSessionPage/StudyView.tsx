import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, Loader2, Pause, Play, RotateCcw, X, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { completeListening, fetchSessionAudio, retryAudio, submitListeningAnswer } from '@/store/Slices/ListeningSlice';
import { OPTION_LETTERS, getTaskByType } from '@/constants/listening';
import { getAudioUrl } from '@/utils/listeningAudio';
import { readVolume, writeVolume } from '@/utils/listeningPrefs';
import { cx } from '@/utils/cx';
import { useListeningAudio } from '@/hooks/useListeningAudio/useListeningAudio';
import { SpeakerOrb } from '@/components/component/listening/SpeakerOrb/SpeakerOrb';
import { VolumeControl } from '@/components/component/listening/VolumeControl/VolumeControl';
import type { ListeningSessionStart } from '@/types/listening/Listening.types';
import styles from './ListeningSessionPage.module.css';

interface StudyViewProps {
  session: ListeningSessionStart;
  onRequestExit: () => void;
}

export function StudyView({ session, onRequestExit }: StudyViewProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const audio = useAppSelector((s) => s.listening.audio);
  const answers = useAppSelector((s) => s.listening.answers);
  const submitError = useAppSelector((s) => s.listening.submitError);
  const finishing = useAppSelector((s) => s.listening.finishing);
  const finishError = useAppSelector((s) => s.listening.finishError);

  const task = getTaskByType(session.material.type);
  const questions = session.material.questions;
  const transcript = session.material.transcript;

  const [wantPlay, setWantPlay] = useState(false);
  const [volume, setVolume] = useState<number>(readVolume);
  const [showTranscript, setShowTranscript] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Аудио запрашиваем только по нажатию «Play»: читающий без прослушивания не тратит TTS и трафик.
  const audioUrl = audio.status === 'ready' ? getAudioUrl(session.id) : null;
  const player = useListeningAudio({ url: audioUrl, volume, autoPlay: wantPlay });
  const startPlayback = player.start;

  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const playsUsed = player.completedPlays + (player.state === 'playing' ? 1 : 0);
  const limitReached = player.completedPlays >= session.maxAllowedPlays;
  const loadingAudio = wantPlay && (audio.status === 'idle' || audio.status === 'loading');

  const handlePlay = useCallback(() => {
    if (audioUrl === null) {
      setWantPlay(true);
      if (audio.status === 'error') dispatch(retryAudio());
      if (audio.status === 'idle' || audio.status === 'error') void dispatch(fetchSessionAudio(session.id));
      return;
    }
    if (!limitReached && player.state !== 'playing') void startPlayback();
  }, [audio.status, audioUrl, dispatch, limitReached, player.state, session.id, startPlayback]);

  const handleSelect = useCallback(
    async (questionId: string, selectedIndex: number): Promise<void> => {
      if (answers[questionId] !== undefined || pendingId !== null) return;
      setPendingId(questionId);
      try {
        await dispatch(submitListeningAnswer({ questionId, selectedIndex }));
      } finally {
        setPendingId(null);
      }
    },
    [answers, dispatch, pendingId],
  );

  const handleFinish = useCallback(async (): Promise<void> => {
    const action = await dispatch(completeListening());
    if (completeListening.fulfilled.match(action)) navigate(`/listening/result/${session.id}`, { replace: true });
  }, [dispatch, navigate, session.id]);

  const handleVolume = useCallback((value: number) => {
    setVolume(value);
    writeVolume(value);
  }, []);

  return (
    <div className={styles['screen']} style={{ '--task-color': task.color } as React.CSSProperties}>
      <header className={styles['toolbar']}>
        <div className={styles['toolbarLeft']}>
          <span className={styles['sectionLabel']}>{t('listening.study.badge')}</span>
          <span className={styles['taskName']}>{session.material.title}</span>
        </div>
        <div className={styles['toolbarRight']}>
          <span className={styles['counter']}>{t('listening.study.progress', { done: answeredCount, total: questions.length })}</span>
          <VolumeControl volume={volume} onChange={handleVolume} />
          <button type="button" className={styles['iconBtn']} onClick={onRequestExit} aria-label={t('listening.session.exit')} title={t('listening.session.exit')}>
            <X size={17} />
          </button>
        </div>
      </header>

      <main className={cx(styles['stage'], styles['studyStage'])}>
        <section className={styles['studyLeft']}>
          <div className={styles['playerCard']}>
            <SpeakerOrb active={player.state === 'playing'} color={task.color} />
            <div className={styles['playerInfo']}>
              <button type="button" className={styles['primaryBtn']} onClick={handlePlay} disabled={limitReached || loadingAudio || player.state === 'playing'}>
                {loadingAudio ? <Loader2 size={16} className={styles['spin']} /> : player.state === 'playing' ? <Pause size={16} /> : player.completedPlays > 0 ? <RotateCcw size={16} /> : <Play size={16} />}
                {loadingAudio ? t('listening.session.preparing') : player.completedPlays > 0 ? t('listening.study.replay') : t('listening.study.play')}
              </button>
              <span className={styles['playsLabel']}>{t('listening.study.plays', { used: Math.min(playsUsed, session.maxAllowedPlays), max: session.maxAllowedPlays })}</span>
              {audioUrl === null && !wantPlay && <p className={styles['studyHint']}>{t('listening.study.playHint')}</p>}
              {audio.status === 'error' && <p className={styles['errorText']} role="alert">{audio.error ?? t('listening.session.audioError')}</p>}
              {player.state === 'blocked' && <p className={styles['studyHint']}>{t('listening.study.blocked')}</p>}
            </div>
          </div>

          {transcript !== null && (
            <div className={styles['transcriptCard']}>
              <button type="button" className={styles['transcriptToggle']} onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript}>
                <span>{showTranscript ? t('listening.study.hideTranscript') : t('listening.study.showTranscript')}</span>
                <ChevronDown size={16} className={cx(styles['chevron'], showTranscript && styles['chevronOpen'])} />
              </button>
              {showTranscript && (
                <div className={styles['transcriptBody']}>
                  {transcript.segments.length > 0
                    ? transcript.segments.map((seg) => (
                        <p key={seg.index} className={styles['segment']}>
                          {seg.speaker ? <strong className={styles['speaker']}>{seg.speaker}: </strong> : null}
                          {seg.text}
                        </p>
                      ))
                    : <p className={styles['segment']}>{transcript.fullText}</p>}
                </div>
              )}
            </div>
          )}
        </section>

        <section className={styles['studyRight']}>
          {questions.map((q, qi) => {
            const entry = answers[q.id];
            const feedback = entry?.feedback ?? null;
            return (
              <article key={q.id} className={styles['studyQuestion']}>
                <p className={styles['questionKicker']}>{t('listening.session.questionOf', { current: qi + 1, total: questions.length })}</p>
                <h2 className={styles['studyQuestionText']}>{q.question}</h2>
                <div className={styles['options']} role="radiogroup" aria-label={q.question}>
                  {q.options.map((option, i) => {
                    const isChosen = entry?.selectedIndex === i;
                    const isCorrect = feedback !== null && feedback.correctIndex === i;
                    const isWrongChoice = feedback !== null && isChosen && !feedback.isCorrect;
                    return (
                      <button
                        key={`${q.id}-${i}`} type="button" role="radio" aria-checked={isChosen}
                        className={cx(styles['option'], isChosen && styles['optionSelected'], isCorrect && styles['optionCorrect'], isWrongChoice && styles['optionWrong'])}
                        onClick={() => { void handleSelect(q.id, i); }}
                        disabled={entry !== undefined || pendingId !== null}
                      >
                        <span className={styles['optionMark']}>{OPTION_LETTERS[i]}</span>
                        <span className={styles['optionText']}>{option}</span>
                        {isCorrect && <CheckCircle2 size={17} className={styles['optionIcon']} />}
                        {isWrongChoice && <XCircle size={17} className={styles['optionIcon']} />}
                      </button>
                    );
                  })}
                </div>
                {feedback !== null && (
                  <div className={cx(styles['feedback'], feedback.isCorrect ? styles['feedbackOk'] : styles['feedbackErr'])} role="status">
                    <strong>{feedback.isCorrect ? t('listening.study.correct') : t('listening.study.incorrect')}</strong>
                    {feedback.explanation !== null && feedback.explanation !== '' && (
                      <p>{feedback.explanation}</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {submitError !== null && <p className={styles['errorText']} role="alert">{t('listening.session.submitError')}</p>}
          {finishError !== null && <p className={styles['errorText']} role="alert">{t('listening.session.finishError')}</p>}

          <button type="button" className={cx(styles['primaryBtn'], styles['finishStudy'])} onClick={() => { void handleFinish(); }} disabled={!allAnswered || finishing}>
            {finishing ? <Loader2 size={15} className={styles['spin']} /> : null}
            {allAnswered ? t('listening.study.finish') : t('listening.study.answerAll')}
          </button>
        </section>
      </main>
    </div>
  );
}