import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { setStoredToken } from '../utils/tokenStore';

const LUMORA_API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
// Auth + billing-subscription must call the SAME backend that mints the cookie
// during OAuth — otherwise a JWT_SECRET drift between services causes silent
// 401 on /me even though login itself succeeded. Route those through CAPRA
// (where Google OAuth callback runs); other lumora-specific routes still use
// LUMORA_API_URL as before.
const AUTH_API_URL = CAPRA_API_URL;
const DEV_MODE = import.meta.env.DEV && !import.meta.env.VITE_REQUIRE_AUTH;

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  onboarding_completed?: boolean;
  job_roles?: string[];
}

interface SubscriptionInfo {
  plan: string;
  status?: string;
}

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  onboardingCompleted: boolean | null;
  subscription: SubscriptionInfo | null;
  subscriptionLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  isLoading: true,
  user: null,
  onboardingCompleted: null,
  subscription: null,
  subscriptionLoading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  // Mirror the token to the module-level tokenStore so non-hook helpers
  // (utils/authHeaders.js, used by Profile / Practice / BadgeGrid /
  // ResumeOptimizer / etc.) can read it without React hooks. Required
  // because the SSO cookie is httpOnly so document.cookie can't see it.
  const setToken = useCallback((next: string | null) => {
    setTokenState(next);
    setStoredToken(next);
  }, []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Dev mode: auto-authenticate as dev user
      if (DEV_MODE) {
        let authed = false;
        try {
          const res = await fetch(`${AUTH_API_URL}/api/v1/auth/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'dev@camora.ai',
              name: 'Dev User',
              provider: 'dev',
              provider_id: 'dev-local-user',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setToken(data.access_token);
            setUser(data.user);
            setOnboardingCompleted(true);
            authed = true;
          }
        } catch { /* backend not available */ }

        // Fallback: mock user if backend sync failed
        if (!authed) {
          setToken('dev-mode');
          setUser({ id: 'dev', email: 'dev@camora.ai', name: 'Dev User' });
          setOnboardingCompleted(true);
        }
        setIsLoading(false);
        return;
      }

      // Check URL hash for OAuth callback tokens (after Google login redirect).
      // Note: the ascend backend already sets the cariara_sso cookie (httpOnly)
      // on its OAuth callback before redirecting, so we DO NOT write the cookie
      // from JS here — that would override httpOnly and re-expose the token.
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params: Record<string, string> = {};
        for (const part of hash.substring(1).split('&')) {
          const eqIdx = part.indexOf('=');
          if (eqIdx === -1) continue;
          params[part.substring(0, eqIdx)] = decodeURIComponent(part.substring(eqIdx + 1));
        }
        const hashToken = params['access_token'];
        if (hashToken) {
          // Clear hash from URL
          window.history.replaceState(null, '', window.location.pathname);
          // Validate with backend
          try {
            const res = await fetch(`${AUTH_API_URL}/api/v1/auth/me`, {
              headers: { Authorization: `Bearer ${hashToken}` },
              credentials: 'include',
            });
            if (res.ok) {
              const data = await res.json();
              // Prefer the freshly minted short-lived token from /me if present.
              setToken(data.access_token || hashToken);
              // Backend /me responses come in two shapes:
              //   (a) flat:    { id, email, name, picture, ..., access_token }   — lumora-backend
              //   (b) nested:  { authenticated: true, user: { id, email, name, ... } }  — ascend-backend
              // `lumorab.cariara.com` runs ascend-backend, so we unwrap data.user
              // when present; otherwise we strip the access_token from the flat body.
              const { access_token: _at, ...flat } = data;
              setUser(data.user ?? flat);
            }
          } catch { /* network error */ }
          // Check onboarding
          try {
            const onbRes = await fetch(`${CAPRA_API_URL}/api/onboarding/status`, {
              credentials: 'include',
              headers: { Authorization: `Bearer ${hashToken}` },
            });
            if (onbRes.ok) {
              const data = await onbRes.json();
              setOnboardingCompleted(data.onboarding_completed);
            }
          } catch { /* capra backend may not be available */ }

          // Apply referral code if present (runs once after OAuth callback)
          const referralCode = localStorage.getItem('camora_referral_code');
          if (referralCode && hashToken) {
            fetch(`${CAPRA_API_URL}/api/referral/apply`, {
              credentials: 'include',
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hashToken}` },
              body: JSON.stringify({ code: referralCode }),
            }).then(() => localStorage.removeItem('camora_referral_code')).catch(() => {});
          }

          setIsLoading(false);
          return;
        }
      }

      // Production: the cariara_sso cookie is now httpOnly, so we can't read it
      // from document.cookie. Instead, call /auth/me with credentials:'include'
      // — the cookie rides along, the backend validates it, and returns a fresh
      // short-lived access_token in the response body which we use as Bearer.
      //
      // Resilience: if /me succeeds but the backend deploy hasn't shipped the
      // access_token field yet, fall back to /refresh which has been returning
      // access_token forever. We also handle the legacy case where the cookie
      // is non-httpOnly (old sessions) by reading it directly as a last resort.
      try {
        const res = await fetch(`${AUTH_API_URL}/api/v1/auth/me`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          let bearerToken: string | undefined = data.access_token;

          if (!bearerToken) {
            // Backend doesn't return access_token in /me response yet —
            // hit /refresh which has been around longer and definitely returns it.
            try {
              const refreshRes = await fetch(`${AUTH_API_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
              });
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                bearerToken = refreshData.access_token;
              }
            } catch { /* fall through */ }
          }

          if (!bearerToken) {
            // Last resort: read a non-httpOnly cookie if one exists (legacy session).
            const m = document.cookie.match(/(?:^|; )cariara_sso=([^;]+)/);
            if (m) bearerToken = decodeURIComponent(m[1]);
          }

          if (bearerToken) {
            setToken(bearerToken);
            // /me may return either flat ({id, email, name, ..., access_token})
            // from lumora-backend or nested ({authenticated, user: {...}}) from
            // ascend-backend. Unwrap data.user when present.
            const { access_token: _at, ...flat } = data;
            void _at;
            setUser(data.user ?? flat);

            // Fetch onboarding status from Capra backend using the fresh token
            try {
              const onboardingRes = await fetch(`${CAPRA_API_URL}/api/onboarding/status`, {
                headers: { Authorization: `Bearer ${bearerToken}` },
                credentials: 'include',
              });
              if (onboardingRes.ok) {
                const o = await onboardingRes.json();
                setOnboardingCompleted(o.onboarding_completed);
              }
            } catch { /* capra backend may not be available */ }
          }
        }
      } catch { /* not logged in or network error */ }
      setIsLoading(false);
    }
    init();
  }, []);

  // Fetch subscription status
  const fetchSubscription = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${AUTH_API_URL}/api/v1/billing/subscription`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Backends return one of:
        //   lumora:  { plan, status }
        //   ascend:  { subscription: { plan_type, status }, plan, plan_type, status }
        const plan = data.plan
          || data.plan_type
          || data.subscription?.plan_type
          || data.subscription?.plan
          || 'free';
        const status = data.status || data.subscription?.status;
        setSubscription({ plan, status });
      } else {
        setSubscription({ plan: 'free' });
      }
    } catch {
      setSubscription({ plan: 'free' });
    }
    setSubscriptionLoading(false);
  }, []);

  // Fetch on token availability
  useEffect(() => {
    if (!token) { setSubscriptionLoading(false); setSubscription({ plan: 'free' }); return; }
    fetchSubscription(token);
  }, [token, fetchSubscription]);

  // Refresh subscription after Stripe checkout return (URL contains session_id or checkout=success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ((params.has('session_id') || params.get('checkout') === 'success') && token) {
      // Delay to allow webhook to process
      const timer = setTimeout(() => fetchSubscription(token), 2000);
      return () => clearTimeout(timer);
    }
  }, [token, fetchSubscription]);

  // Public method to force subscription refresh (e.g., after payment)
  const refreshSubscription = useCallback(() => {
    if (token) fetchSubscription(token);
  }, [token, fetchSubscription]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setOnboardingCompleted(null);
    setSubscription(null);
    // The cariara_sso cookie is httpOnly so JS can't clear it — hit the backend
    // /logout endpoint which returns a Set-Cookie with an expired cookie.
    fetch(`${CAPRA_API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => { /* navigate anyway even if the clear call fails */ })
      .finally(() => { window.location.href = '/'; });
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, isLoading, user, onboardingCompleted, subscription, subscriptionLoading, logout, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
