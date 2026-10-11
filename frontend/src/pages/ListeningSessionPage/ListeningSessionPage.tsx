import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { leaveListeningSession } from '@/store/Slices/ListeningSlice';
import { getTaskByType } from '@/constants/listening';
import { ListeningMode } from '@/types/globalTypes';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ExitDialog } from '@/components/component/listening/ExitDialog/ExitDialog';
import { PracticeView } from './PracticeView';
import { StudyView } from './StudyView';

export default function ListeningSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sessionId } = useParams<{ sessionId: string }>();
  const session = useAppSelector((s) => s.listening.session);
  const result = useAppSelector((s) => s.listening.result);
  const [exitOpen, setExitOpen] = useState(false);
  const leavingRef = useRef(false);

  // Состояние сессии живёт только в сторе (ответы/аудио в памяти) — прямой заход по ссылке
  // или перезагрузка возвращает на хаб; брошенная сессия закроется при следующем старте.
  useEffect(() => {
    if (leavingRef.current) return;
    if (session === null || (sessionId !== undefined && sessionId !== session.id)) {
      navigate('/listening', { replace: true });
    }
  }, [session, sessionId, navigate]);

  const handleConfirmExit = useCallback(() => {
    // Сначала уходим на страницу задания, потом чистим стор — эффект-редирект выше не перебьёт переход.
    leavingRef.current = true;
    const target = session !== null ? `/listening/${getTaskByType(session.material.type).slug}` : '/listening';
    navigate(target, { replace: true });
    void dispatch(leaveListeningSession());
  }, [dispatch, navigate, session]);

  if (session === null || result !== null) return <FullPageSpinner label={t('listening.session.preparing')} />;

  return (
    <>
      {session.mode === ListeningMode.PRACTICE
        ? <PracticeView key={session.id} session={session} onRequestExit={() => setExitOpen(true)} />
        : <StudyView key={session.id} session={session} onRequestExit={() => setExitOpen(true)} />}
      <ExitDialog
        open={exitOpen}
        title={t('listening.session.exitTitle')}
        message={t('listening.session.exitText')}
        confirmLabel={t('listening.session.leave')}
        cancelLabel={t('listening.session.stay')}
        onConfirm={handleConfirmExit}
        onCancel={() => setExitOpen(false)}
      />
    </>
  );
}