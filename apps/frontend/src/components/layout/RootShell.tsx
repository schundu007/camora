import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

interface RootShellProps {
  children: React.ReactNode;
}

export default function RootShell({ children }: RootShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollYRef = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

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
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
