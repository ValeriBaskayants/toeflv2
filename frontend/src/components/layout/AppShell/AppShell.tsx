import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/layout/SlideBar/Sidebar';
import styles from './AppShell.module.css';

// AppShell wraps all authenticated pages via React Router nested routes.
// It renders the persistent Sidebar + a content area with <Outlet />.
// Each child page renders inside the Outlet slot.

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className={styles['shell']}>
      {/* Sidebar (always mounted, hidden on mobile until opened) */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Mobile overlay — tap to close sidebar */}
      {sidebarOpen && (
        <div
          className={styles['overlay']}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Main content area */}
      <main className={styles['main']}>
        {/* Mobile top bar */}
        <header className={styles['mobileBar']}>
          <button
            className={styles['hamburger']}
            onClick={openSidebar}
            type="button"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <span className={styles['mobileTitle']}>TOEFL Prep</span>
        </header>

        {/* Page content */}
        <div className={styles['content']}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}