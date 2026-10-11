import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Eye, EyeOff, Loader2, Play, RotateCcw, StickyNote, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import {
  completeListening, expireListening, fetchSessionAudio, retryAudio, saveListeningNotes, submitListeningAnswer,
} from '@/store/Slices/ListeningSlice';
import { NOTES_AUTOSAVE_MS, OPTION_LETTERS, TIMER_WARNING_SEC_MAX, getTaskByType } from '@/constants/listening';
import { getAudioUrl } from '@/utils/listeningAudio';
import { readShowTime, readVolume, writeShowTime, writeVolume } from '@/utils/listeningPrefs';
import { formatTime } from '@/utils/formatTime';
import { cx } from '@/utils/cx';
import { useCountdown } from '@/hooks/useCountdown/useCountdown';
import { useListeningAudio } from '@/hooks/useListeningAudio/useListeningAudio';
import { SpeakerOrb } from '@/components/component/listening/SpeakerOrb/SpeakerOrb';
import { NotesPanel } from '@/components/component/listening/NotesPanel/NotesPanel';
import { VolumeControl } from '@/components/component/listening/VolumeControl/VolumeControl';
import type { ListeningSessionStart } from '@/types/listening/Listening.types';
import styles from './ListeningSessionPage.module.css';

interface PracticeViewProps {
  session: ListeningSessionStart;
  onRequestExit: () => void;
}

type Phase = 'audio' | 'questions';

export function PracticeView({ session, onRequestExit }: PracticeViewProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const audio = useAppSelector((s) => s.listening.audio);
  const answers = useAppSelector((s) => s.listening.answers);
  const submitting = useAppSelector((s) => s.listening.submitting);
  const submitError = useAppSelector((s) => s.listening.submitError);
  const finishing = useAppSelector((s) => s.listening.finishing);
  const finishError = useAppSelector((s) => s.listening.finishError);

  const task = getTaskByType(session.material.type);
  const questions = session.material.questions;
  const total = questions.length;

  const [phase, setPhase] = useState<Phase>('audio');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [volume, setVolume] = useState<number>(readVolume);
  const [showTime, setShowTime] = useState<boolean>(readShowTime);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const questionsStartedRef = useRef(false);
  const finishedRef = useRef(false);
  const busyRef = useRef(false);
  const expireRequestedRef = useRef(false);
  const notesDirtyRef = useRef(false);
  const notesRef = useRef('');
  const indexRef = useRef(0);
  const selectedRef = useRef<number | null>(null);
  const answersRef = useRef(answers);

  useEffect(() => {
    indexRef.current = index;
    selectedRef.current = selected;
    answersRef.current = answers;
    notesRef.current = notes;
  });

  // Первое (и единственное в строгой зоне) прослушивание. condition в thunk защищает от двойного вызова.
  useEffect(() => {
    void dispatch(fetchSessionAudio(session.id));
  }, [dispatch, session.id]);

  const startQuestions = useCallback(() => {
    if (questionsStartedRef.current) return;
    questionsStartedRef.current = true;
    setPhase('questions');
    if (session.answerWindowSec !== null) setDeadline(Date.now() + session.answerWindowSec * 1000);
  }, [session.answerWindowSec]);

  const audioUrl = audio.status === 'ready' ? getAudioUrl(session.id) : null;
  const player = useListeningAudio({ url: audioUrl, volume, autoPlay: true, onEnded: startQuestions });
  const startPlayback = player.start;

  const flushNotes = useCallback(async (): Promise<void> => {
    if (!notesDirtyRef.current) return;
    notesDirtyRef.current = false;
    const text = notesRef.current.trim();
    const payload = text === '' ? [] : [{ id: 'main', text: notesRef.current, createdAt: new Date().toISOString() }];
    await dispatch(saveListeningNotes(payload));
  }, [dispatch]);

  useEffect(() => {
    if (!notesDirtyRef.current) return undefined;
    const id = window.setTimeout(() => { void flushNotes(); }, NOTES_AUTOSAVE_MS);
    return () => window.clearTimeout(id);
  }, [notes, flushNotes]);

  const finish = useCallback(
    async (kind: 'complete' | 'expire'): Promise<void> => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      await flushNotes();

      if (kind === 'expire') {
        // Выбранный, но не подтверждённый ответ фиксируем — как на тесте при истечении времени.
        const question = questions[indexRef.current];
        const pick = selectedRef.current;
        if (question !== undefined && pick !== null && answersRef.current[question.id] === undefined) {
          await dispatch(submitListeningAnswer({ questionId: question.id, selectedIndex: pick }));
        }
      }

      const action = await dispatch(kind === 'complete' ? completeListening() : expireListening());
      if (completeListening.fulfilled.match(action) || expireListening.fulfilled.match(action)) {
        navigate(`/listening/result/${session.id}`, { replace: true });
        return;
      }
      finishedRef.current = false;
    },
    [dispatch, flushNotes, navigate, questions, session.id],
  );

  const handleExpire = useCallback(async (): Promise<void> => {
    if (finishedRef.current) return;
    if (busyRef.current) {
      expireRequestedRef.current = true;
      return;
    }
    await finish('expire');
  }, [finish]);

  const handleNext = useCallback(async (): Promise<void> => {
    const question = questions[index];
    if (question === undefined || selected === null || busyRef.current || finishedRef.current) return;

    busyRef.current = true;
    try {
      await flushNotes();
      const action = await dispatch(submitListeningAnswer({ questionId: question.id, selectedIndex: selected }));
      if (!submitListeningAnswer.fulfilled.match(action)) return;

      if (index + 1 < total) {
        setIndex(index + 1);
        setSelected(null);
      } else {
        await finish('complete');
      }
    } finally {
      busyRef.current = false;
    }
    if (expireRequestedRef.current && !finishedRef.current) await finish('expire');
  }, [dispatch, finish, flushNotes, index, questions, selected, total]);

  const remaining = useCountdown(deadline, () => { void handleExpire(); });

  // Клавиатура: 1–9 / A–J выбирают ответ, Enter — Next. Не мешаем вводу заметок, диалогу выхода и системным сочетаниям.
  useEffect(() => {
    if (phase !== 'questions') return undefined;
    const question = questions[index];
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target;
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return;
      if (target instanceof HTMLElement && target.closest('[role="alertdialog"]') !== null) return;
      if (question === undefined) return;

      if (e.key === 'Enter') {
        if (target instanceof HTMLButtonElement) {
          // Enter на уже выбранном варианте = Next; на остальных кнопках Enter работает как обычный клик.
          if (target.getAttribute('role') === 'radio' && target.getAttribute('aria-checked') === 'true' && selected !== null) {
            e.preventDefault();
            void handleNext();
          }
          return;
        }
        if (selected !== null) void handleNext();
        return;
      }

      const byDigit = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1;
      const byLetter = e.key.length === 1 ? OPTION_LETTERS.findIndex((l) => l === e.key.toUpperCase()) : -1;
      const picked = byDigit >= 0 ? byDigit : byLetter;
      if (picked >= 0 && picked < question.options.length) setSelected(picked);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, questions, index, selected, handleNext]);

  const handleVolume = useCallback((value: number) => {
    setVolume(value);
    writeVolume(value);
  }, []);

  const toggleTime = useCallback(() => {
    setShowTime((prev) => {
      writeShowTime(!prev);
      return !prev;
    });
  }, []);

  const handleNotes = useCallback((value: string) => {
    notesDirtyRef.current = true;
    setNotes(value);
  }, []);

  const handleRetryAudio = useCallback(() => {
    // Аудио уже скачано (сбой воспроизведения) — повторный запрос съел бы единственное прослушивание.
    if (getAudioUrl(session.id) !== null) {
      void startPlayback();
      return;
    }
    dispatch(retryAudio());
    void dispatch(fetchSessionAudio(session.id));
  }, [dispatch, session.id, startPlayback]);

  const question = questions[index];
  const canReplay = session.maxAllowedPlays > 1 && player.completedPlays < session.maxAllowedPlays && player.state !== 'playing';
  const audioFailed = audio.status === 'error' || player.state === 'error';
  const audioPreparing = audio.status === 'idle' || audio.status === 'loading';
  const warnAt = session.answerWindowSec === null ? 0 : Math.min(TIMER_WARNING_SEC_MAX, Math.ceil(session.answerWindowSec * 0.25));
  const warn = remaining !== null && remaining <= warnAt;
  const timeFraction = remaining !== null && session.answerWindowSec ? remaining / session.answerWindowSec : 1;
  const busy = submitting || finishing;
  const progress = player.durationSec > 0 ? Math.min(100, (player.currentSec / player.durationSec) * 100) : 0;

  return (
    <div className={styles['screen']} style={{ '--task-color': task.color } as React.CSSProperties}>
      <header className={styles['toolbar']}>
        <div className={styles['toolbarLeft']}>
          <span className={styles['sectionLabel']}>{t('listening.session.section')}</span>
          <span className={styles['taskName']}>{t(`listening.tasks.${task.key}.name`)}</span>
        </div>
        <div className={styles['toolbarRight']}>
          {phase === 'questions' && total > 0 && (
            <span className={styles['counter']}>{t('listening.session.questionOf', { current: Math.min(index + 1, total), total })}</span>
          )}
          {deadline !== null && remaining !== null && (
            <button type="button" className={cx(styles['timerBtn'], warn && styles['timerWarn'])} onClick={toggleTime} aria-pressed={!showTime} title={showTime ? t('listening.session.hideTime') : t('listening.session.showTime')}>
              <Clock size={14} />
              <span className={styles['timerText']}>{showTime ? formatTime(remaining) : t('listening.session.timeLabel')}</span>
              {showTime ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
          <VolumeControl volume={volume} onChange={handleVolume} />
          <button type="button" className={cx(styles['iconBtn'], notesOpen && styles['iconBtnActive'])} onClick={() => setNotesOpen((v) => !v)} aria-pressed={notesOpen} aria-label={t('listening.session.notes')} title={t('listening.session.notes')}>
            <StickyNote size={16} />
          </button>
          <button type="button" className={styles['nextBtn']} onClick={() => { void handleNext(); }} disabled={phase !== 'questions' || selected === null || busy}>
            {busy ? <Loader2 size={15} className={styles['spin']} /> : null}
            {index + 1 >= total && phase === 'questions' ? t('listening.session.finish') : t('listening.session.next')}
          </button>
          <button type="button" className={styles['iconBtn']} onClick={onRequestExit} aria-label={t('listening.session.exit')} title={t('listening.session.exit')}>
            <X size={17} />
          </button>
        </div>
      </header>

      {deadline !== null && (
        <div className={styles['timeBar']} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(timeFraction * 100)}>
          <div className={cx(styles['timeBarFill'], warn && styles['timeBarWarn'])} style={{ transform: `scaleX(${timeFraction})` }} />
        </div>
      )}

      <main className={styles['stage']}>
        {phase === 'audio' && (
          <section className={styles['listenCard']} aria-live="polite">
            <SpeakerOrb active={player.state === 'playing'} color={task.color} />
            <h1 className={styles['listenTitle']}>{t('listening.session.listenCarefully')}</h1>
            <p className={styles['listenHint']}>
              {session.maxAllowedPlays > 1
                ? t('listening.session.replayHint', { count: session.maxAllowedPlays })
                : t('listening.session.playsOnce')}
            </p>

            {audioPreparing && (
              <p className={styles['statusLine']}><Loader2 size={15} className={styles['spin']} /> {t('listening.session.preparing')}</p>
            )}

            {player.durationSec > 0 && !audioFailed && (
              <div className={styles['audioProgress']} aria-hidden="true"><div className={styles['audioProgressFill']} style={{ width: `${progress}%` }} /></div>
            )}

            {player.state === 'blocked' && (
              <button type="button" className={styles['primaryBtn']} onClick={() => { void startPlayback(); }}>
                <Play size={16} /> {t('listening.session.playAudio')}
              </button>
            )}

            {audioFailed && (
              <div className={styles['audioError']} role="alert">
                <p>{audio.error ?? t('listening.session.audioError')}</p>
                <div className={styles['inlineActions']}>
                  <button type="button" className={styles['secondaryBtn']} onClick={handleRetryAudio}>
                    <RotateCcw size={14} /> {t('listening.session.tryAgain')}
                  </button>
                  <button type="button" className={styles['primaryBtn']} onClick={startQuestions}>{t('listening.session.continueToQuestions')}</button>
                </div>
              </div>
            )}
          </section>
        )}

        {phase === 'questions' && question !== undefined && (
          <section key={question.id} className={styles['questionCard']}>
            <p className={styles['questionKicker']}>{t('listening.session.questionOf', { current: index + 1, total })}</p>
            <h1 className={styles['questionText']}>{question.question}</h1>
            <div className={styles['options']} role="radiogroup" aria-label={question.question}>
              {question.options.map((option, i) => (
                <button
                  key={`${question.id}-${i}`} type="button" role="radio" aria-checked={selected === i}
                  className={cx(styles['option'], selected === i && styles['optionSelected'])}
                  onClick={() => setSelected(i)} disabled={busy}
                >
                  <span className={styles['optionMark']}>{OPTION_LETTERS[i]}</span>
                  <span className={styles['optionText']}>{option}</span>
                </button>
              ))}
            </div>
            {canReplay && (
              <button type="button" className={styles['replayBtn']} onClick={() => { void startPlayback(); }}>
                <RotateCcw size={14} /> {t('listening.session.replay')}
              </button>
            )}
            {submitError !== null && <p className={styles['errorText']} role="alert">{t('listening.session.submitError')}</p>}
          </section>
        )}

        {phase === 'questions' && question === undefined && (
          <section className={styles['questionCard']}>
            <p className={styles['errorText']}>{t('listening.session.noQuestions')}</p>
            <button type="button" className={styles['primaryBtn']} onClick={() => { void finish('complete'); }}>{t('listening.session.finish')}</button>
          </section>
        )}

        {finishError !== null && (
          <p className={styles['errorText']} role="alert">
            {t('listening.session.finishError')}{' '}
            <button type="button" className={styles['linkBtn']} onClick={() => { void finish(index + 1 >= total ? 'complete' : 'expire'); }}>{t('listening.session.tryAgain')}</button>
          </p>
        )}
      </main>

      <footer className={styles['mobileBar']}>
        <button type="button" className={styles['primaryBtn']} onClick={() => { void handleNext(); }} disabled={phase !== 'questions' || selected === null || busy}>
          {busy ? <Loader2 size={15} className={styles['spin']} /> : null}
          {index + 1 >= total && phase === 'questions' ? t('listening.session.finish') : t('listening.session.next')}
        </button>
      </footer>

      <NotesPanel open={notesOpen} value={notes} onChange={handleNotes} onClose={() => setNotesOpen(false)} />
    </div>
  );
}