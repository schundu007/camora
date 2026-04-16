import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

interface RootShellProps {
  children: React.ReactNode;
}

export default function RootShell({ children }: RootShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resumeBannerDismissed, setResumeBannerDismissed] = useState(false);
  const scrollYRef = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const { hasResume } = useAuth();

  const showResumeBanner = hasResume === false && !resumeBannerDismissed;

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 768) {
      scrollYRef.current = window.scrollY;
      document.body.classList.add('scroll-locked');
      document.body.style.top = `-${scrollYRef.current}px`;
      return () => {
        document.body.classList.remove('scroll-locked');
        document.body.style.top = '';
        window.scrollTo(0, scrollYRef.current);
      };
    }
  }, [sidebarOpen]);

  // Scroll main content area to top on route change
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

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
        <main ref={mainRef} id="app-scroll-container" className="flex-1 overflow-y-auto">
          {showResumeBanner && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              style={{ background: 'var(--accent-subtle)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Upload your resume to get personalized interview prep.{' '}
                  <Link to="/capra/onboarding" className="font-semibold underline" style={{ color: 'var(--accent)' }}>
                    Upload now
                  </Link>
                </span>
              </div>
              <button
                onClick={() => setResumeBannerDismissed(true)}
                className="flex-shrink-0 p-1 rounded transition-colors hover:bg-black/10"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
