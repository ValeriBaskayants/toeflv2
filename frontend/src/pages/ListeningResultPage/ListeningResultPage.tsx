import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, ChevronDown, Clock, RotateCcw, XCircle, Zap } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { leaveListeningSession, startToeflListening } from '@/store/Slices/ListeningSlice';
import { FEEDBACK_BANDS, OPTION_LETTERS, getTaskByType } from '@/constants/listening';
import { ListeningMode } from '@/types/globalTypes';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { cx } from '@/utils/cx';
import styles from './ListeningResultPage.module.css';

function feedbackKey(accuracy: number): string {
  if (accuracy >= FEEDBACK_BANDS.perfect) return 'perfect';
  if (accuracy >= FEEDBACK_BANDS.strong) return 'strong';
  if (accuracy >= FEEDBACK_BANDS.ok) return 'ok';
  if (accuracy >= FEEDBACK_BANDS.low) return 'low';
  return 'veryLow';
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  return (
    <svg viewBox="0 0 108 108" className={styles['ring']} role="img" aria-label={`${score}%`}>
      <circle cx="54" cy="54" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
      <circle
        cx="54" cy="54" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`} transform="rotate(-90 54 54)"
        style={{ transition: 'stroke-dasharray 1s var(--ease-spring)' }}
      />
      <text x="54" y="60" textAnchor="middle" className={styles['ringText']} fill={color}>{score}%</text>
    </svg>
  );
}

export default function ListeningResultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sessionId } = useParams<{ sessionId: string }>();
  const result = useAppSelector((s) => s.listening.result);
  const session = useAppSelector((s) => s.listening.session);
  const starting = useAppSelector((s) => s.listening.starting);
  const [showTranscript, setShowTranscript] = useState(false);
  const leavingRef = useRef(false);

  // Результат хранится только в сторе (отдельного GET нет) — после перезагрузки возвращаем на хаб.
  useEffect(() => {
    if (leavingRef.current) return;
    if (result === null || session === null || (sessionId !== undefined && sessionId !== result.id)) {
      navigate('/listening', { replace: true });
    }
  }, [result, session, sessionId, navigate]);

  const task = session !== null ? getTaskByType(session.material.type) : null;

  const handleBack = useCallback(() => {
    // Сначала переход, потом очистка стора — эффект-редирект не перебьёт путь на страницу задания.
    leavingRef.current = true;
    navigate(task !== null ? `/listening/${task.slug}` : '/listening', { replace: true });
    void dispatch(leaveListeningSession());
  }, [dispatch, navigate, task]);

  const handleAnother = useCallback(async () => {
    if (session === null || task === null || starting) return;
    // Старт нового задания сбрасывает result — не даём эффекту уйти на хаб поверх нашего перехода.
    leavingRef.current = true;
    const action = await dispatch(startToeflListening(session.material.type));
    if (startToeflListening.fulfilled.match(action)) {
      navigate(`/listening/session/${action.payload.id}`, { replace: true });
    } else {
      // Нет подходящего материала/сбой сети — страница задания покажет ошибку старта.
      navigate(`/listening/${task.slug}`, { replace: true });
    }
  }, [dispatch, navigate, session, starting, task]);

  if (result === null || session === null || task === null) return <FullPageSpinner label={t('listening.session.preparing')} />;

  const accuracy = Math.round(result.rawAccuracy);
  const timedOut = result.detailedReview.some((r) => r.timedOut);
  const color = accuracy >= 80 ? 'var(--success)' : accuracy >= 50 ? 'var(--warning)' : 'var(--danger)';
  const isExam = result.mode === ListeningMode.PRACTICE;

  return (
    <div className={styles['page']} style={{ '--task-color': task.color } as React.CSSProperties}>
      <button type="button" className={styles['backLink']} onClick={handleBack}>
        <ArrowLeft size={15} /> {t('listening.result.backToTask')}
      </button>

      <section className={styles['hero']}>
        <ScoreRing score={accuracy} color={color} />
        <div className={styles['heroBody']}>
          <p className={styles['kicker']}>{t(`listening.tasks.${task.key}.name`)} · {isExam ? t('listening.task.examMode') : t('listening.task.studyMode')}</p>
          <h1 className={styles['title']}>{t('listening.result.title')}</h1>
          {timedOut && <p className={styles['timedOut']}><Clock size={14} /> {t('listening.result.timesUp')}</p>}
          <p className={styles['score']}>{t('listening.result.scoreOf', { correct: result.correctCount, total: result.totalCount })}</p>
          <p className={styles['feedback']}>{t(`listening.result.feedback.${feedbackKey(accuracy)}`)}</p>
          <div className={styles['chips']}>
            <span className={styles['xp']}><Zap size={13} /> {t('listening.result.xp', { xp: result.xpEarned })}</span>
            <span className={cx(styles['counted'], result.countedAsCompleted && styles['countedYes'])}>
              {result.countedAsCompleted ? t('listening.result.counted') : t('listening.result.notCounted')}
            </span>
          </div>
        </div>
      </section>

      <div className={styles['actions']}>
        <button type="button" className={styles['primaryBtn']} onClick={() => { void handleAnother(); }} disabled={starting}>
          <RotateCcw size={15} /> {t('listening.result.tryAnother')}
        </button>
        <button type="button" className={styles['secondaryBtn']} onClick={handleBack}>{t('listening.result.backToTask')}</button>
      </div>

      <section className={styles['review']}>
        <h2 className={styles['reviewTitle']}>{t('listening.result.reviewTitle')}</h2>
        {result.detailedReview.map((item, qi) => (
          <article key={item.questionId} className={cx(styles['item'], item.isCorrect ? styles['itemOk'] : styles['itemErr'])}>
            <header className={styles['itemHead']}>
              {item.isCorrect ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
              <span>{t('listening.session.questionOf', { current: qi + 1, total: result.detailedReview.length })}</span>
            </header>
            <h3 className={styles['itemQuestion']}>{item.question}</h3>
            <ul className={styles['optionList']}>
              {item.options.map((option, i) => {
                const isCorrect = i === item.correctIndex;
                const isChosen = i === item.selectedIndex;
                return (
                  <li key={`${item.questionId}-${i}`} className={cx(styles['opt'], isCorrect && styles['optCorrect'], isChosen && !isCorrect && styles['optWrong'])}>
                    <span className={styles['optMark']}>{OPTION_LETTERS[i]}</span>
                    <span className={styles['optText']}>{option}</span>
                    {isCorrect && <span className={styles['optTag']}>{t('listening.result.correctAnswer')}</span>}
                    {isChosen && !isCorrect && <span className={styles['optTag']}>{t('listening.result.yourAnswer')}</span>}
                  </li>
                );
              })}
            </ul>
            {item.timedOut && <p className={styles['noAnswer']}>{t('listening.result.noAnswer')}</p>}
            {item.explanation !== null && item.explanation !== '' && (
              <p className={styles['explanation']}><strong>{t('listening.result.explanation')}: </strong>{item.explanation}</p>
            )}
          </article>
        ))}
      </section>

      <section className={styles['transcript']}>
        <button type="button" className={styles['transcriptToggle']} onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript}>
          <span>{showTranscript ? t('listening.result.hideTranscript') : t('listening.result.showTranscript')}</span>
          <ChevronDown size={16} className={cx(styles['chevron'], showTranscript && styles['chevronOpen'])} />
        </button>
        {showTranscript && <p className={styles['transcriptText']}>{result.transcript}</p>}
      </section>
    </div>
  );
}