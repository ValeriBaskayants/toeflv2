import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useAppSelector } from '@/store/store';
import { selectIsAuthenticated, selectIsInitializing } from '@/store/Slices/AuthSlice';
import styles from './LoginPage.module.css';

const GOOGLE_AUTH_URL = `${import.meta.env['VITE_API_BASE_URL'] as string}/auth/google`;

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'hy', label: 'HY' },
] as const;

const FEATURES = [
  { icon: '🃏', key: 'spaced' },
  { icon: '🤖', key: 'ai' },
  { icon: '📊', key: 'levels' },
  { icon: '📈', key: 'progress' },
  { icon: '🌍', key: 'multilingual' },
] as const;

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function ThemeToggle() {
  const toggle = () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  };

  return (
    <button className={styles['iconBtn']} onClick={toggle} type="button" aria-label="Toggle theme">
      🌙
    </button>
  );
}

function LanguageSelector() {
  const currentLang = i18n.language.slice(0, 2);

  const handleChange = (lang: string) => {
    void i18n.changeLanguage(lang);
  };

  return (
    <div className={styles['langGroup']}>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          className={`${styles['langBtn']} ${currentLang === code ? styles['langBtnActive'] : ''}`}
          onClick={() => handleChange(code)}
          type="button"
          aria-label={`Switch language to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isInitializing = useAppSelector(selectIsInitializing);

  // If user somehow lands on /login while already authenticated, redirect away
  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate]);

  const handleGoogleLogin = () => {
    // Full-page redirect — browser navigates to our backend which
    // sets the state param and redirects to Google's OAuth page
    window.location.href = GOOGLE_AUTH_URL;
  };

  return (
    <div className={styles['root']}>
      {/* ── Left: Brand panel ── */}
      <aside className={styles['brand']}>
        <div className={styles['brandDecorTop']} aria-hidden="true" />
        <div className={styles['brandDecorBottom']} aria-hidden="true" />

        <div className={styles['brandContent']}>
          <div className={styles['logoRow']}>
            <span className={styles['logoEmoji']} aria-hidden="true">📚</span>
            <span className={styles['logoText']}>TOEFL Prep</span>
          </div>

          <p className={styles['tagline']}>{t('auth.tagline')}</p>

          <ul className={styles['featureList']} aria-label="Features">
            {FEATURES.map(({ icon, key }) => (
              <li key={key} className={styles['featureItem']}>
                <span className={styles['featureIcon']} aria-hidden="true">{icon}</span>
                <span>{t(`features.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles['levelBadge']} style={{ top: '15%', right: '12%' }} aria-hidden="true">C2</div>
        <div className={styles['levelBadge']} style={{ bottom: '25%', right: '8%' }} aria-hidden="true">B2</div>
      </aside>

      {/* ── Right: Auth panel ── */}
      <main className={styles['authPanel']}>
        <div className={styles['controls']}>
          <LanguageSelector />
          <ThemeToggle />
        </div>

        <div className={styles['card']}>
          <header className={styles['cardHeader']}>
            <h1 className={styles['title']}>{t('auth.welcome')}</h1>
            <p className={styles['subtitle']}>{t('auth.tagline')}</p>
          </header>

          <button
            className={styles['googleBtn']}
            onClick={handleGoogleLogin}
            type="button"
          >
            <GoogleLogo />
            <span>{t('auth.signIn')}</span>
          </button>

          <p className={styles['disclaimer']}>{t('auth.disclaimer')}</p>
        </div>
      </main>
    </div>
  );
}