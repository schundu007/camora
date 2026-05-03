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

    // Fire-and-forget analytics. We deliberately avoid Content-Type:
    // application/json because that triggers a CORS preflight, and the
    // pageview endpoint isn't worth blocking page loads on. sendBeacon
    // sends as a "simple" request (no preflight, no CORS headers needed
    // beyond the response Access-Control-Allow-Origin), survives across
    // tab close, and ignores response status — which is exactly the
    // semantics of a pixel-tracker. Falls back to keepalive fetch with a
    // text/plain Blob if sendBeacon is missing (older browsers, some
    // Electron contexts).
    const payload = JSON.stringify({
      path: pathname,
      email: user?.email || null,
      referrer: document.referrer || null,
    });
    const url = `${API}/api/visitors/pageview`;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain;charset=UTF-8' }));
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch { /* ignore */ }
  }, [pathname, user?.email]);
}
