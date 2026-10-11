import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Mail, MessageSquare, Shuffle, ChevronRight, BookOpen, Lightbulb } from 'lucide-react';
import styles from './WritingPage.module.css';

interface WritingTypeCard {
  key: 'scramble' | 'email' | 'discussion' | 'vocabulary' | 'quiz';
  to: string;
  icon: React.ElementType;
  color: string;
}

const CARDS: WritingTypeCard[] = [
  { key: 'scramble', to: '/writing/scramble', icon: Shuffle, color: '#6366f1' },
  { key: 'email', to: '/writing/email', icon: Mail, color: '#0ea5e9' },
  { key: 'discussion', to: '/writing/discussion', icon: MessageSquare, color: '#8b5cf6' },
  { key: 'vocabulary', to: '/vocabulary', icon: BookOpen, color: '#10b981' },
  { key: 'quiz', to: '/quiz', icon: Lightbulb, color: '#f59e0b' },
];

export default function WritingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <h1 className={styles['pageTitle']}>{t('writing.hub.title')}</h1>
        <p className={styles['pageSubtitle']}>{t('writing.hub.subtitle')}</p>
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
            <div className={styles['typeIconWrap']}><Icon size={26} /></div>
            <div className={styles['typeBody']}>
              <h2 className={styles['typeName']}>{t(`writing.hub.types.${key}.name`)}</h2>
              <p className={styles['typeDesc']}>{t(`writing.hub.types.${key}.desc`)}</p>
            </div>
            <ChevronRight size={18} className={styles['typeArrow']} />
          </article>
        ))}
      </div>
    </div>
  );
}