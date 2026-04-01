import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

const LUMORA_API_URL = import.meta.env.VITE_LUMORA_API_URL || 'http://localhost:8000';
const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';
const ASCEND_URL = import.meta.env.VITE_ASCEND_URL || 'https://capra.cariara.com';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  onboarding_completed?: boolean;
  job_roles?: string[];
}

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  onboardingCompleted: boolean | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  isLoading: true,
  user: null,
  onboardingCompleted: null,
  logout: () => {},
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

  useEffect(() => {
    async function init() {
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

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setOnboardingCompleted(null);
    clearCookie('cariara_sso');
    window.location.href = ASCEND_URL;
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, isLoading, user, onboardingCompleted, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
