import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

const LUMORA_API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
const ASCEND_URL = import.meta.env.VITE_ASCEND_URL || 'https://camora.cariara.com';
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
  refreshSubscription: () => void;
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
  refreshSubscription: () => {},
});

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; domain=.cariara.com; path=/; max-age=0; secure; samesite=lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
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
          const res = await fetch(`${LUMORA_API_URL}/api/v1/auth/sync`, {
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

      // Check URL hash for OAuth callback tokens (after Google login redirect)
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
          // Set cookie for future visits
          document.cookie = `cariara_sso=${hashToken}; domain=.cariara.com; path=/; max-age=${30*24*60*60}; secure; samesite=lax`;
          // Validate with backend
          try {
            const res = await fetch(`${LUMORA_API_URL}/api/v1/auth/me`, {
              headers: { Authorization: `Bearer ${hashToken}` },
            });
            if (res.ok) {
              setToken(hashToken);
              setUser(await res.json());
            }
          } catch { /* network error */ }
          // Check onboarding
          try {
            const onbRes = await fetch(`${CAPRA_API_URL}/api/onboarding/status`, {
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
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hashToken}` },
              body: JSON.stringify({ code: referralCode }),
            }).then(() => localStorage.removeItem('camora_referral_code')).catch(() => {});
          }

          setIsLoading(false);
          return;
        }
      }

      // Production: read SSO cookie from Ascend
      const ssoToken = getCookie('cariara_sso');
      if (ssoToken) {
        try {
          const res = await fetch(`${LUMORA_API_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${ssoToken}` },
          });
          if (res.ok) {
            setToken(ssoToken);
            setUser(await res.json());
          }
        } catch { /* network error */ }

        // Fetch onboarding status from Capra backend
        try {
          const onboardingRes = await fetch(`${CAPRA_API_URL}/api/onboarding/status`, {
            headers: { Authorization: `Bearer ${ssoToken}` },
          });
          if (onboardingRes.ok) {
            const data = await onboardingRes.json();
            setOnboardingCompleted(data.onboarding_completed);
          }
        } catch { /* capra backend may not be available */ }
      }
      setIsLoading(false);
    }
    init();
  }, []);

  // Fetch subscription status
  const fetchSubscription = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${LUMORA_API_URL}/api/v1/billing/subscription`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription({ plan: data.plan || data.plan_type || 'free', status: data.status });
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

  // Refresh subscription after Stripe checkout return (URL contains session_id)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('session_id') && token) {
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
    clearCookie('cariara_sso');
    window.location.href = ASCEND_URL;
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
