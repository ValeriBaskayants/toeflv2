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
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { clearAuth, selectUser } from '@/store/Slices/AuthSlice';
import { api } from '@/api';
import { useTheme } from '@/hooks/useTheme/Usetheme';
import { selectDueCount } from '@/store/Slices/MistakesSlice';
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

function UserAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar !== null) {
    return (
      <img src={avatar} alt={name} className={styles['avatarImg']} referrerPolicy="no-referrer" />
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

  // Due-review badge count from mistakes slice
  const dueCount = useAppSelector(selectDueCount);

  const handleLogout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    } finally {
      dispatch(clearAuth());
      navigate('/login', { replace: true });
    }
  };

  const handleLangChange = (lang: string) => void i18n.changeLanguage(lang);

  return (
    <aside className={`${styles['sidebar']} ${isOpen ? styles['sidebarOpen'] : ''}`}>
      <button
        className={styles['closeBtn']}
        onClick={onClose}
        type="button"
        aria-label="Close sidebar"
      >
        <X size={18} />
      </button>

      {/* Logo */}
      <div className={styles['logo']}>
        <div className={styles['logoMark']}>
          <span className={styles['logoLetter']}>T</span>
        </div>
        <span className={styles['logoText']}>TOEFL Prep</span>
      </div>

      {/* Navigation */}
      <nav className={styles['nav']} aria-label="Main navigation">
        {/* ── Overview ── */}
        <div className={styles['navSection']}>
          <span className={styles['sectionLabel']}>{t('navigation.overview')}</span>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${styles['navItem']} ${isActive ? styles['navItemActive'] : ''}`
            }
            onClick={onClose}
          >
            <LayoutDashboard size={16} className={styles['navIcon']} />
            <span>{t('navigation.dashboard')}</span>
          </NavLink>

          <NavLink
            to="/progress"
            className={({ isActive }) =>
              `${styles['navItem']} ${isActive ? styles['navItemActive'] : ''}`
            }
            onClick={onClose}
          >
            <BarChart3 size={16} className={styles['navIcon']} />
            <span>{t('navigation.progress')}</span>
          </NavLink>

          {/* Mistakes with due-review badge */}
          <NavLink
            to="/mistakes"
            className={({ isActive }) =>
              `${styles['navItem']} ${isActive ? styles['navItemActive'] : ''}`
            }
            onClick={onClose}
          >
            <AlertTriangle size={16} className={styles['navIcon']} />
            <span>{t('navigation.mistakes')}</span>
            {dueCount > 0 && <span className={styles['navBadge']}>{dueCount}</span>}
          </NavLink>
        </div>

        {/* ── Practice ── */}
        <div className={styles['navSection']}>
          <span className={styles['sectionLabel']}>{t('navigation.practiceTitle')}</span>

          {[
            { to: '/writing', Icon: PenLine, label: 'navigation.writing' },
            { to: '/reading', Icon: BookOpen, label: 'navigation.reading' },
            { to: '/listening', Icon: Headphones, label: 'navigation.listening' },
            { to: '/speaking', Icon: Mic, label: 'navigation.speaking' },
            { to: '/grammar', Icon: CheckCheck, label: 'navigation.grammar' },
            { to: '/vocabulary', Icon: Layers, label: 'navigation.vocabulary' },
          ].map(({ to, Icon, label }) => (
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

        {/* ── Admin (role-gated) ── */}
        {user?.role === 'ADMIN' && (
          <div className={styles['navSection']}>
            <span className={styles['sectionLabel']}>System</span>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `${styles['navItem']} ${styles['navItemAdmin']} ${isActive ? styles['navItemActive'] : ''}`
              }
              onClick={onClose}
            >
              <ShieldAlert size={16} className={styles['navIcon']} />
              <span>Admin Panel</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Bottom controls */}
      <div className={styles['bottom']}>
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

        <button
          className={styles['themeBtn']}
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          <span>{theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}</span>
        </button>

        <div className={styles['divider']} />

        {user !== null && (
          <div className={styles['userRow']}>
            <UserAvatar name={user.name} avatar={user.avatar} />
            <div className={styles['userInfo']}>
              <span className={styles['userName']}>{user.name}</span>
              <span className={styles['userEmail']}>{user.email}</span>
            </div>
            <button
              className={styles['logoutBtn']}
              onClick={() => {
                void handleLogout();
              }}
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
