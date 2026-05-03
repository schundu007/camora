import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

// Only hand the token off to the official mobile app's URL scheme. Custom
// schemes can be claimed by any installed app, so we still treat this as
// best-effort — App Links / Universal Links is the proper long-term fix.
const ALLOWED_SCHEMES = ['camora://'];

function isAllowedRedirect(target: string): boolean {
  return ALLOWED_SCHEMES.some(scheme => target.startsWith(scheme));
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
          <p style={{ color: '#DC2626' }}>{error}</p>
        ) : (
          <p style={{ color: '#A1A8B3' }}>
            {isLoading ? 'Signing you in…' : token ? 'Returning to app…' : 'Redirecting to Google…'}
          </p>
        )}
      </div>
    </div>
  );
}
