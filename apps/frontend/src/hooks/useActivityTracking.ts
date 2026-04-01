import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { activityTracker } from '@/lib/activity-tracker';

/**
 * Hook that wires the activity tracker to route changes.
 * Call once in the app layout — it handles everything.
 *
 * Returns `trackEvent` for manual event tracking from components.
 */
export function useActivityTracking() {
  const { token } = useAuth();
  const { pathname } = useLocation();
  const initedRef = useRef(false);

  // Init tracker when token becomes available — only destroy on true unmount
  useEffect(() => {
    if (token && !initedRef.current) {
      initedRef.current = true;
      activityTracker.init(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Cleanup only on component unmount (app layout unmount = leaving app)
  useEffect(() => {
    return () => {
      if (initedRef.current) {
        activityTracker.destroy();
        initedRef.current = false;
      }
    };
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (!pathname || !activityTracker.isActive) return;

    // Derive page name from pathname
    const page = derivePageName(pathname);
    activityTracker.trackPageView(page, pathname);
  }, [pathname]);

  return {
    trackEvent: (eventType: string, category?: string, metadata?: Record<string, any>) => {
      activityTracker.trackEvent(eventType, category, metadata);
    },
  };
}

function derivePageName(pathname: string): string {
  if (pathname === '/app') return 'interview';
  if (pathname.includes('/coding')) return 'coding';
  if (pathname.includes('/design')) return 'design';
  return pathname.split('/').pop() || 'unknown';
}
