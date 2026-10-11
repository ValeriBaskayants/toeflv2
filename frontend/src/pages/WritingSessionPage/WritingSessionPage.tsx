import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Send, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { submitSession, setDraftText, resetSession, setSubmissionTimeout, fetchSubmission } from '@/store/Slices/WritingSlice';
import { WritingType } from '@/types/globalTypes';
import { formatTime } from '@/utils/formatTime';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './WritingSessionPage.module.css';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 70000;

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

export default function WritingSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();

  const { session, draftText, submitting, pendingSubmissionId, submitError } = useAppSelector((s) => s.writing);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    if (session === null || (urlSessionId !== undefined && urlSessionId !== session.sessionId)) {
      navigate('/writing', { replace: true });
    }
  }, [session, urlSessionId, navigate]);

  const handleAutoSubmit = useCallback(() => {
    if (hasAutoSubmittedRef.current) return;
    hasAutoSubmittedRef.current = true;
    void dispatch(submitSession(draftText));
  }, [dispatch, draftText]);

  useEffect(() => {
    if (session === null || pendingSubmissionId !== null) return undefined;
    const startedAtMs = new Date(session.startedAt).getTime();

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      const remaining = session.timeLimitSec - elapsed;
      setRemainingSec(Math.max(0, remaining));
      if (remaining <= 0) handleAutoSubmit();
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [session, pendingSubmissionId, handleAutoSubmit]);

  const pendingIdRef = useRef(pendingSubmissionId);
  useEffect(() => { pendingIdRef.current = pendingSubmissionId; }, [pendingSubmissionId]);

  useEffect(() => {
    if (pendingSubmissionId === null) return undefined;

    let isMounted = true;
    let pollTimer: number | undefined;

    const maxTimeout = window.setTimeout(() => {
      isMounted = false;
      dispatch(setSubmissionTimeout());
    }, POLL_TIMEOUT_MS);

    const poll = async () => {
      if (!isMounted || pendingIdRef.current === null) return;
      try {
        const result = await dispatch(fetchSubmission(pendingIdRef.current));
        if (fetchSubmission.fulfilled.match(result) && result.payload.status !== 'PENDING') {
          window.clearTimeout(maxTimeout);
          navigate(`/writing/result/${result.payload.id}`, { replace: true });
          return;
        }
      } catch {
        // следующий тик попробует снова
      }
      if (isMounted && pendingIdRef.current !== null) {
        pollTimer = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    void poll();

    return () => {
      isMounted = false;
      window.clearTimeout(pollTimer);
      window.clearTimeout(maxTimeout);
    };
  }, [pendingSubmissionId, dispatch, navigate]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    await dispatch(submitSession(draftText));
  }, [dispatch, draftText, submitting]);

  const handleExit = useCallback(() => {
    dispatch(resetSession());
    navigate('/writing', { replace: true });
  }, [dispatch, navigate]);

  if (session === null) {
    return <FullPageSpinner label={t('writing.loading')} />;
  }

  if (pendingSubmissionId !== null) {
    return (
      <div className={styles['pendingPage']}>
        <Loader2 size={40} className={styles['spin']} />
        <h2 className={styles['pendingTitle']}>{t('writing.analyzing')}</h2>
        <p className={styles['pendingHint']}>{t('writing.analyzingHint')}</p>
      </div>
    );
  }

  const wordCount = countWords(draftText);
  const isDiscussion = session.prompt.type === WritingType.ACADEMIC_DISCUSSION;
  const isTimeWarning = remainingSec !== null && remainingSec <= 60;
  const meetsMin = wordCount >= session.minWords;

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <span className={styles['sectionLabel']}>
          {isDiscussion ? t('writing.discussion.sectionLabel') : t('writing.email.sectionLabel')}
        </span>
        <span className={`${styles['timer']} ${isTimeWarning ? styles['timerWarn'] : ''}`}>
          {remainingSec !== null ? formatTime(remainingSec) : '--:--'}
        </span>
        <button type="button" className={styles['exitBtn']} onClick={handleExit} aria-label="Exit" disabled={submitting}>
          <X size={18} />
        </button>
      </header>

      <div className={styles['layout']}>
        <div className={styles['promptColumn']}>
          <div className={styles['questionCard']}>
            <span className={styles['questionLabel']}>{t('writing.prompt')}</span>
            <p className={styles['questionText']}>{session.prompt.prompt}</p>
          </div>

          {isDiscussion && session.prompt.discussionPeerResponses.length > 0 && (
            <div className={styles['peerThread']}>
              <span className={styles['peerThreadLabel']}>{t('writing.discussion.peerLabel')}</span>
              {session.prompt.discussionPeerResponses.map((peer, i) => (
                <div key={i} className={styles['peerPost']}>
                  <div className={styles['peerAvatar']}>{peer.authorName.charAt(0).toUpperCase()}</div>
                  <div className={styles['peerBody']}>
                    <span className={styles['peerName']}>{peer.authorName}</span>
                    <p className={styles['peerText']}>{peer.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles['editorColumn']}>
          <textarea
            className={styles['textarea']}
            value={draftText}
            onChange={(e) => dispatch(setDraftText(e.target.value))}
            placeholder={isDiscussion ? t('writing.discussion.placeholder') : t('writing.email.placeholder')}
            disabled={submitting}
            spellCheck
            autoFocus
          />

          {submitError !== null && <p className={styles['errorText']}>{submitError}</p>}

          <div className={styles['footer']}>
            <span className={`${styles['wordCount']} ${meetsMin ? styles['wordCountOk'] : ''}`}>
              {t('writing.wordCountLive', { count: wordCount, min: session.minWords })}
            </span>
            <button type="button" className={styles['submitBtn']} onClick={() => { void handleSubmit(); }} disabled={submitting}>
              {submitting ? (
                <><Loader2 size={16} className={styles['spin']} />{t('writing.submitting')}</>
              ) : (
                <><Send size={16} />{t('writing.submit')}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}