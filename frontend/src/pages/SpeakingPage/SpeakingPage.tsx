import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Mic, ChevronRight } from 'lucide-react';
import styles from './SpeakingPage.module.css';

interface SpeakingTypeCard {
  key: 'listenAndRepeat';
  to: string;
  icon: React.ElementType;
  color: string;
}

const CARDS: SpeakingTypeCard[] = [
  { key: 'listenAndRepeat', to: '/speaking/listen-and-repeat', icon: Mic, color: '#f97316' },
];

export default function SpeakingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <h1 className={styles['pageTitle']}>{t('speaking.hub.title')}</h1>
        <p className={styles['pageSubtitle']}>{t('speaking.hub.subtitle')}</p>
      </header>

      <div className={styles['grid']}>
        {CARDS.map(({ key, to, icon: Icon, color }) => (
          <article
            key={key}
            className={styles['typeCard']}
            style={{ '--card-color': color } as React.CSSProperties}
            role="button"
            tabIndex={0}
            onClick={() => navigate(to)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(to); }}
          >
            <div className={styles['typeIconWrap']}>
              <Icon size={26} />
            </div>
            <div className={styles['typeBody']}>
              <h2 className={styles['typeName']}>{t(`speaking.hub.types.${key}.name`)}</h2>
              <p className={styles['typeDesc']}>{t(`speaking.hub.types.${key}.desc`)}</p>
            </div>
            <ChevronRight size={18} className={styles['typeArrow']} />
          </article>
        ))}
      </div>
    </div>
  );
}