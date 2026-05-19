import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/layout/SlideBar/Sidebar';
import styles from './AppShell.module.css';

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className={styles['shell']}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {sidebarOpen && (
        <div className={styles['overlay']} onClick={closeSidebar} aria-hidden="true" />
      )}

      <main className={styles['main']}>
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

        <div className={styles['content']}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
