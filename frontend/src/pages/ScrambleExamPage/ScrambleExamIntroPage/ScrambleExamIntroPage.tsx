import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Clock3, Ban, Award } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { selectUser } from '@/store/Slices/AuthSlice';
import { startScrambleExam } from '@/store/Slices/ScrambleExamSlice';
import styles from './ScrambleExamIntroPage.module.css';

export default function ScrambleExamIntroPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isStarting = useAppSelector((s) => s.scrambleExam.isStarting);
  const error = useAppSelector((s) => s.scrambleExam.error);

  const handleStart = useCallback(async () => {
    if (user === null) return;
    const result = await dispatch(startScrambleExam(user.currentLevel));
    if (startScrambleExam.fulfilled.match(result)) {
      navigate(`/writing/scramble/exam/session/${result.payload.blockId}`);
    }
  }, [dispatch, navigate, user]);

  if (user === null) return null;

  return (
    <div className={styles['page']}>
      <div className={styles['card']}>
        <FileText size={40} className={styles['icon']} />
        <h1 className={styles['title']}>{t('scramble.exam.cardTitle')}</h1>
        <p className={styles['desc']}>{t('scramble.exam.cardDesc')}</p>

        <ul className={styles['rules']}>
          <li><Clock3 size={16} />{t('scramble.exam.rule1')}</li>
          <li><Ban size={16} />{t('scramble.exam.rule2')}</li>
          <li><Award size={16} />{t('scramble.exam.rule3')}</li>
        </ul>

        {error !== null && <p className={styles['error']}>{error}</p>}

        <button type="button" className={styles['startBtn']} onClick={() => { void handleStart(); }} disabled={isStarting}>
          {isStarting ? t('scramble.checking') : t('scramble.exam.startBtn')}
        </button>
      </div>
    </div>
  );
}