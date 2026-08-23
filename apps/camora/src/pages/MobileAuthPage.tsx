import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// Hand the token off to either:
//   - The verified Universal Link / App Link target on our own domain (preferred —
//     ownership proven by AASA/assetlinks.json under apps/camora/public/.well-known).
//   - The legacy custom scheme (only if AASA hasn't propagated yet).
// Anything else is rejected.
const ALLOWED_SCHEMES = ['camora://'];
const ALLOWED_HTTPS_PREFIXES = ['https://camora.cariara.com/mobile/auth'];

function isAllowedRedirect(target: string): boolean {
  if (ALLOWED_SCHEMES.some(scheme => target.startsWith(scheme))) return true;
  if (ALLOWED_HTTPS_PREFIXES.some(prefix => target.startsWith(prefix))) return true;
  return false;
}

/**
 * /mobile/auth — token handoff for the Expo app.
 *
 * Flow:
 *   1. Mobile opens this page in WebBrowser with `?redirect=camora://auth`.
 *   2. AuthContext hydrates from the cariara_sso cookie. Once `token` is
 *      available, we redirect to `${redirect}?token=<jwt>` and the mobile
 *      Linking handler picks it up.
 *   3. If the cookie is missing/expired, we bounce through Google OAuth,
 *      preserving the same handoff URL as the post-login returnTo.
 */
export default function MobileAuthPage() {
  const { token, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const redirect = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('redirect') || '';
    return isAllowedRedirect(raw) ? raw : '';
  }, []);

  useEffect(() => {
    if (!redirect) {
      setError('Missing or invalid redirect target.');
      return;
    }
    if (isLoading) return;

    if (token) {
      // If the redirect IS this page (Universal Link round-trip), append the
      // token as a query param. The mobile app's Linking handler reads it on
      // cold start via getInitialURL() and on warm start via the 'url' event.
      const sep = redirect.includes('?') ? '&' : '?';
      window.location.replace(`${redirect}${sep}token=${encodeURIComponent(token)}`);
      return;
    }

    // Not authed — bounce through Google OAuth, returning back to this page.
    const returnTo = `/mobile/auth?redirect=${encodeURIComponent(redirect)}`;
    window.location.replace(
      `${CAPRA_API_URL}/api/auth/google/login?redirect=${encodeURIComponent(returnTo)}`,
    );
  }, [redirect, token, isLoading]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0F1115',
      color: '#F4F5F7',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 24,
    }}>
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Camora</div>
        {error ? (
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        ) : (
          <p style={{ color: '#A1A8B3' }}>
            {isLoading ? 'Signing you in…' : token ? 'Returning to app…' : 'Redirecting to Google…'}
          </p>
        )}
      </div>
    </div>
  );
}
