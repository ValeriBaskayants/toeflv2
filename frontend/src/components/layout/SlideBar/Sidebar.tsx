import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  PenLine,
  BookOpen,
  Headphones,
  Mic,
  Layers,
  CheckCheck,
  BarChart3,
  Globe,
  Sun,
  Moon,
  LogOut,
  X,
} from 'lucide-react';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { clearAuth, selectUser } from '@/store/Slices/AuthSlice';
import { api } from '@/api/api';
import { useTheme } from '@/hooks/useTheme/Usetheme';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'hy', label: 'HY' },
] as const;

const NAV_SECTIONS = [
  {
    label: 'navigation.overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'navigation.dashboard' },
    ],
  },
  {
    label: 'navigation.practiceTitle',
    items: [
      { to: '/writing',    icon: PenLine,         label: 'navigation.writing' },
      { to: '/reading',    icon: BookOpen,         label: 'navigation.reading' },
      { to: '/listening',  icon: Headphones,       label: 'navigation.listening' },
      { to: '/speaking',   icon: Mic,              label: 'navigation.speaking' },
      { to: '/grammar',    icon: CheckCheck,       label: 'navigation.grammar' },
      { to: '/vocabulary', icon: Layers,           label: 'navigation.vocabulary' },
    ],
  },
  {
    label: 'navigation.analyticsTitle',
    items: [
      { to: '/progress', icon: BarChart3, label: 'navigation.progress' },
    ],
  },
] as const;

function UserAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar !== null) {
    return (
      <img
        src={avatar}
        alt={name}
        className={styles['avatarImg']}
        referrerPolicy="no-referrer"
      />
    );
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return <div className={styles['avatarInitials']}>{initials}</div>;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const { theme, toggleTheme } = useTheme();
  const currentLang = i18n.language.slice(0, 2);

  const handleLogout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort
    } finally {
      dispatch(clearAuth());
      navigate('/login', { replace: true });
    }
  };

  const handleLangChange = (lang: string) => {
    void i18n.changeLanguage(lang);
  };

  return (
    <aside className={`${styles['sidebar']} ${isOpen ? styles['sidebarOpen'] : ''}`}>
      {/* ── Close button (mobile only) ── */}
      <button
        className={styles['closeBtn']}
        onClick={onClose}
        type="button"
        aria-label="Close sidebar"
      >
        <X size={18} />
      </button>

      {/* ── Logo ── */}
      <div className={styles['logo']}>
        <div className={styles['logoMark']}>
          <span className={styles['logoLetter']}>T</span>
        </div>
        <span className={styles['logoText']}>TOEFL Prep</span>
      </div>

      {/* ── Navigation ── */}
      <nav className={styles['nav']} aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className={styles['navSection']}>
            <span className={styles['sectionLabel']}>{t(section.label)}</span>
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles['navItem']} ${isActive ? styles['navItemActive'] : ''}`
                }
                onClick={onClose}
              >
                <Icon size={16} className={styles['navIcon']} />
                <span>{t(label)}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Bottom controls ── */}
      <div className={styles['bottom']}>
        {/* Language selector */}
        <div className={styles['langRow']}>
          <Globe size={14} className={styles['controlIcon']} />
          <div className={styles['langGroup']}>
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                className={`${styles['langBtn']} ${currentLang === code ? styles['langBtnActive'] : ''}`}
                onClick={() => handleLangChange(code)}
                type="button"
                aria-label={`Switch to ${label}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme toggle */}
        <button
          className={styles['themeBtn']}
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          <span>{theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}</span>
        </button>

        {/* Divider */}
        <div className={styles['divider']} />

        {/* User row + logout */}
        {user !== null && (
          <div className={styles['userRow']}>
            <UserAvatar name={user.name} avatar={user.avatar} />
            <div className={styles['userInfo']}>
              <span className={styles['userName']}>{user.name}</span>
              <span className={styles['userEmail']}>{user.email}</span>
            </div>
            <button
              className={styles['logoutBtn']}
              onClick={() => { void handleLogout(); }}
              type="button"
              aria-label={t('auth.signOut')}
              title={t('auth.signOut')}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}