import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

interface RootShellProps {
  children: React.ReactNode;
}

export default function RootShell({ children }: RootShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 768) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => document.body.classList.remove('scroll-locked');
  }, [sidebarOpen]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main ref={mainRef} id="app-scroll-container" className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', background: 'var(--bg-app)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
