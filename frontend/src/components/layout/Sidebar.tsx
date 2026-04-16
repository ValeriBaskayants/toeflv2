// import { NavLink, useNavigate } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
// // import { useAuthStore } from '../../store/Slices/AuthSlice';
// import { useThemeStore  } from '../../store/themeStore';

// const NAV_ITEMS = [
//   { to: '/',           icon: '🏠', key: 'home' },
//   { to: '/lessons',    icon: '📖', key: 'lessons' },
//   { to: '/exercises',  icon: '✏️', key: 'exercises' },
//   { to: '/quiz',       icon: '🎯', key: 'quiz' },
//   { to: '/vocabulary', icon: '📚', key: 'vocabulary' },
//   { to: '/reading',    icon: '📄', key: 'reading' },
//   { to: '/listening',  icon: '🎧', key: 'listening' },
//   { to: '/writing',    icon: '🖊️', key: 'writing' },
//   { to: '/mistakes',   icon: '🔍', key: 'mistakes' },
//   { to: '/level-test', icon: '🏆', key: 'levelTest' },
//   { to: '/progress',   icon: '📊', key: 'progress' },
// ];

// const LANGS = [
//   { code: 'en', label: 'EN' },
//   { code: 'ru', label: 'RU' },
//   { code: 'hy', label: 'ՀՅ' },
// ];

// interface SidebarProps {
//   open?: boolean;
//   onClose?: () => void;
// }

// export default function Sidebar({ open = false, onClose }: SidebarProps) {
//   const { t, i18n } = useTranslation();
//   // const { user, logout } = useAuthStore();
//   const { theme, toggle } = useThemeStore();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     // logout();
//     navigate('/login');
//     onClose?.();
//   };

//   const levelColor = (lvl: string) => {
//     if (lvl?.startsWith('A')) return '#4A7C59';
//     if (lvl?.startsWith('B')) return '#2980B9';
//     if (lvl?.startsWith('C')) return '#8E44AD';
//     return '#E8A845';
//   };

//   const handleNavClick = () => {
//     onClose?.();
//   };

//   return (
//     <aside
//       className={`app-sidebar${open ? ' app-sidebar--open' : ''}`}
//       style={{
//         position: 'fixed', top: 0, left: 0, bottom: 0,
//         width: 240,
//         zIndex: 100,
//         background: 'var(--surface)',
//         borderRight: '1px solid var(--border-color)',
//         display: 'flex', flexDirection: 'column',
//         boxShadow: 'var(--shadow-sm)',
//         overflowY: 'auto',
//       }}
//     >
//       {/* Close button (mobile only) */}
//       <button
//         className="sidebar-close-btn"
//         onClick={onClose}
//         aria-label="Close menu"
//       >
//         ✕
//       </button>

//       {/* Logo */}
//       <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
//           <span style={{ fontSize: '1.6rem' }}>📚</span>
//           <div>
//             <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
//               TOEFL Prep
//             </div>
//             <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
//               {user?.email?.split('@')[0]}
//             </div>
//           </div>
//         </div>

//         {user && (
//           <div style={{ marginTop: '1rem' }}>
//             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
//               <span style={{
//                 background: levelColor(user.currentLevel),
//                 color: '#fff', padding: '0.15rem 0.6rem',
//                 borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700,
//                 fontFamily: 'DM Mono, monospace',
//               }}>
//                 {user.currentLevel}
//               </span>
//               <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
//                 {user.xp?.toLocaleString()} XP
//               </span>
//             </div>
//             {user.streak > 0 && (
//               <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
//                 🔥 {user.streak} {t('home.weeklyStreak')}
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Nav */}
//       <nav style={{ flex: 1, padding: '0.75rem 0' }}>
//         {NAV_ITEMS.map(item => (
//           <NavLink
//             key={item.to}
//             to={item.to}
//             end={item.to === '/'}
//             onClick={handleNavClick}
//             style={({ isActive }) => ({
//               display: 'flex', alignItems: 'center', gap: '0.75rem',
//               padding: '0.65rem 1.25rem',
//               fontSize: '0.88rem', fontWeight: isActive ? 600 : 400,
//               color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
//               background: isActive ? 'var(--accent-light)' : 'transparent',
//               borderRight: isActive ? '3px solid var(--accent)' : '3px solid transparent',
//               textDecoration: 'none',
//               transition: 'all 0.15s ease',
//               minHeight: 44,
//             })}
//           >
//             <span style={{ fontSize: '1rem', width: '1.2rem', textAlign: 'center' }}>{item.icon}</span>
//             {t(`nav.${item.key}`)}
//           </NavLink>
//         ))}

//         {user?.role === 'admin' && (
//           <NavLink
//             to="/admin"
//             onClick={handleNavClick}
//             style={({ isActive }) => ({
//               display: 'flex', alignItems: 'center', gap: '0.75rem',
//               padding: '0.65rem 1.25rem',
//               fontSize: '0.88rem', fontWeight: isActive ? 600 : 400,
//               color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
//               background: isActive ? 'var(--accent-light)' : 'transparent',
//               borderRight: isActive ? '3px solid var(--accent)' : '3px solid transparent',
//               textDecoration: 'none',
//               transition: 'all 0.15s ease',
//               minHeight: 44,
//             })}
//           >
//             <span style={{ fontSize: '1rem', width: '1.2rem', textAlign: 'center' }}>⚙️</span>
//             {t('nav.admin')}
//           </NavLink>
//         )}
//       </nav>

//       {/* Bottom controls */}
//       <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>
//         <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
//           {LANGS.map(l => (
//             <button
//               key={l.code}
//               onClick={() => i18n.changeLanguage(l.code)}
//               style={{
//                 flex: 1, padding: '0.35rem',
//                 fontSize: '0.7rem', fontWeight: 600,
//                 fontFamily: 'DM Mono, monospace',
//                 borderRadius: '6px', border: '1px solid',
//                 borderColor: i18n.language === l.code ? 'var(--accent)' : 'var(--border-color)',
//                 background: i18n.language === l.code ? 'var(--accent-light)' : 'transparent',
//                 color: i18n.language === l.code ? 'var(--accent)' : 'var(--text-muted)',
//                 cursor: 'pointer', transition: 'all 0.15s',
//                 minHeight: 36,
//               }}
//             >
//               {l.label}
//             </button>
//           ))}
//         </div>

//         <button
//           onClick={toggle}
//           style={{
//             width: '100%', padding: '0.5rem',
//             borderRadius: '8px', border: '1px solid var(--border-color)',
//             background: 'var(--surface-elevated)',
//             color: 'var(--text-secondary)', fontSize: '0.82rem',
//             cursor: 'pointer', display: 'flex', alignItems: 'center',
//             justifyContent: 'center', gap: '0.4rem',
//             marginBottom: '0.5rem', transition: 'all 0.15s',
//             minHeight: 40,
//           }}
//         >
//           {theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode'}
//         </button>

//         <button
//           onClick={handleLogout}
//           style={{
//             width: '100%', padding: '0.5rem',
//             borderRadius: '8px', border: '1px solid var(--border-color)',
//             background: 'transparent', color: 'var(--text-muted)',
//             fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
//             minHeight: 40,
//           }}
//         >
//           {t('auth.logout')} →
//         </button>
//       </div>
//     </aside>
//   );
// }