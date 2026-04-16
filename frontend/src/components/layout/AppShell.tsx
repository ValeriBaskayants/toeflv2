import { type ReactNode, useState } from 'react';
// import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /> */}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 98,
          }}
        />
      )}

      <main style={{
        marginLeft: 'var(--sidebar-w)',
        flex: 1,
        padding: '2.5rem 2.5rem 4rem',
        minWidth: 0,
        maxWidth: '1100px',
        transition: 'margin-left 0.3s ease',
      }}>
        {/* Mobile hamburger header */}
        <div className="mobile-header">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 800, fontSize: '1.1rem' }}>
            📚 TOEFL Prep
          </span>
        </div>

        {children}
      </main>
    </div>
  );
}