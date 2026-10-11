import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Ear } from 'lucide-react';
import { LISTENING_TASKS } from '@/constants/listening';
import styles from './ListeningPage.module.css';

export default function ListeningPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <h1 className={styles['pageTitle']}>{t('listening.hub.title')}</h1>
        <p className={styles['pageSubtitle']}>{t('listening.hub.subtitle')}</p>
      </header>

      <div className={styles['grid']}>
        {LISTENING_TASKS.map(({ key, slug, icon: Icon, color }) => (
          <article
            key={key}
            className={styles['typeCard']}
            style={{ '--card-color': color } as React.CSSProperties}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/listening/${slug}`)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/listening/${slug}`); }}
          >
            <div className={styles['typeIconWrap']}><Icon size={26} /></div>
            <div className={styles['typeBody']}>
              <h2 className={styles['typeName']}>{t(`listening.tasks.${key}.name`)}</h2>
              <p className={styles['typeDesc']}>{t(`listening.tasks.${key}.desc`)}</p>
            </div>
            <ChevronRight size={18} className={styles['typeArrow']} />
          </article>
        ))}
      </div>

      <aside className={styles['info']}>
        <Ear size={18} className={styles['infoIcon']} />
        <div>
          <h3 className={styles['infoTitle']}>{t('listening.hub.infoTitle')}</h3>
          <p className={styles['infoText']}>{t('listening.hub.infoText')}</p>
        </div>
      </aside>
    </div>
  );
}