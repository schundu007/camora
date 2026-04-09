import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

export function usePageTracker() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const lastTracked = useRef('');

  useEffect(() => {
    // Avoid duplicate tracking for the same path in the same session
    if (pathname === lastTracked.current) return;
    lastTracked.current = pathname;

    fetch(`${API}/api/visitors/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        email: user?.email || null,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [pathname, user?.email]);
}
