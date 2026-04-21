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

  // Lock body scroll when shell is mounted
  useEffect(() => {
    document.body.classList.add('shell-active');
    return () => document.body.classList.remove('shell-active');
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <TopBar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
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
