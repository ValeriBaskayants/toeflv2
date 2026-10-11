import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Target, Brain, BarChart2, MessageSquare, Lightbulb, Underline, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { fetchSubmission, resetSession } from '@/store/Slices/WritingSlice';
import { WritingType } from '@/types/globalTypes';
import { FullPageSpinner } from '@/components/ui/Spinner';
import styles from './WritingResultPage.module.css';

const SCORE_COLOR = (s: number) => (s >= 80 ? 'var(--success)' : s >= 60 ? 'var(--warning)' : 'var(--danger)');

function ScoreRing({ score, band }: { score: number; band: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const color = SCORE_COLOR(score);
  const filled = (score / 100) * circ;
  return (
    <svg viewBox="0 0 100 100" className={styles['scoreRing']}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 1s var(--ease-spring)' }}
      />
      <text x="50" y="44" textAnchor="middle" fill={color} fontSize="18" fontWeight="800">{Math.round(score)}</text>
      <text x="50" y="62" textAnchor="middle" fill="var(--text-3)" fontSize="9">Band {band}/5</text>
    </svg>
  );
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const color = SCORE_COLOR(score);
  return (
    <div className={styles['scoreBar']}>
      <div className={styles['scoreBarHead']}>
        <span className={styles['scoreBarIcon']} style={{ color }}>{icon}</span>
        <span className={styles['scoreBarLabel']}>{label}</span>
        <span className={styles['scoreBarVal']} style={{ color }}>{Math.round(score)}</span>
      </div>
      <div className={styles['scoreBarTrack']}>
        <div className={styles['scoreBarFill']} style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

export default function WritingResultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { submissionId } = useParams<{ submissionId: string }>();
  const { currentSubmission, submissionLoading } = useAppSelector((s) => s.writing);

  useEffect(() => {
    if (submissionId !== undefined) void dispatch(fetchSubmission(submissionId));
  }, [submissionId, dispatch]);

  const handleBack = () => {
    dispatch(resetSession());
    navigate('/writing', { replace: true });
  };

  if (submissionLoading || currentSubmission === null) {
    return <FullPageSpinner label={t('writing.loading')} />;
  }

  const { analysis } = currentSubmission;

  if (analysis === undefined) {
    return (
      <div className={styles['page']}>
        <button type="button" className={styles['backLink']} onClick={handleBack}><ArrowLeft size={15} /> {t('writing.backToPrompts')}</button>
        <div className={styles['errorState']}>
          <XCircle size={40} className={styles['errorStateIcon']} />
          <h2>{t('writing.analysisError')}</h2>
          <p>{t('writing.analysisErrorHint')}</p>
          <button type="button" className={styles['backBtn']} onClick={handleBack}>{t('writing.backToPrompts')}</button>
        </div>
      </div>
    );
  }

  const isDiscussion = currentSubmission.prompt.type === WritingType.ACADEMIC_DISCUSSION;
  const taskSpecificLabel = isDiscussion ? t('writing.analysis.engagement') : t('writing.analysis.conventions');

  return (
    <div className={styles['page']}>
      <button type="button" className={styles['backLink']} onClick={handleBack}><ArrowLeft size={15} /> {t('writing.backToPrompts')}</button>

      <div className={styles['scoreHero']}>
        <ScoreRing score={analysis.overallScore} band={analysis.officialBand} />
        <div className={styles['quickStats']}>
          <div className={styles['quickStat']}>
            <span className={styles['quickStatVal']}>{analysis.wordCount}</span>
            <span className={styles['quickStatLabel']}>{t('writing.words')}</span>
          </div>
          <div className={styles['quickStat']}>
            <span className={styles['quickStatVal']} style={{ color: analysis.errorCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {analysis.errorCount}
            </span>
            <span className={styles['quickStatLabel']}>{t('writing.analysis.errors')}</span>
          </div>
          {analysis.detectedTone !== undefined && (
            <span className={styles['toneBadge']}><MessageSquare size={11} /> {analysis.detectedTone}</span>
          )}
        </div>
      </div>

      <div className={styles['scoreBars']}>
        <ScoreBar label={t('writing.analysis.grammar')} score={analysis.grammarScore} icon={<CheckCircle2 size={14} />} />
        <ScoreBar label={t('writing.analysis.task')} score={analysis.taskScore} icon={<Target size={14} />} />
        <ScoreBar label={t('writing.analysis.vocabulary')} score={analysis.vocabularyScore} icon={<Brain size={14} />} />
        <ScoreBar label={t('writing.analysis.coherence')} score={analysis.coherenceScore} icon={<BarChart2 size={14} />} />
        <ScoreBar label={taskSpecificLabel} score={analysis.taskSpecificScore} icon={<MessageSquare size={14} />} />
      </div>

      {analysis.feedback !== undefined && (
        <div className={styles['feedbackCard']}>
          <div className={styles['feedbackHead']}><Lightbulb size={15} /> {t('writing.analysis.feedback')}</div>
          <p className={styles['feedbackText']}>{analysis.feedback}</p>
        </div>
      )}

      {analysis.errors.length > 0 && (
        <div className={styles['errorsList']}>
          {analysis.errors.map((err, i) => (
            <div key={i} className={styles['errorItem']}>
              <div className={styles['errorItemHead']}><Underline size={13} /> <span>{err.message}</span></div>
              {err.replacements.length > 0 && (
                <div className={styles['errorReps']}>
                  {err.replacements.map((r) => <span key={r} className={styles['errorRep']}>{r}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}