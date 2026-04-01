import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ASCEND_URL = import.meta.env.VITE_ASCEND_URL || 'https://capra.cariara.com';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  isLoading: true,
  user: null,
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const ssoToken = getCookie('cariara_sso');
      if (ssoToken) {
        try {
          const res = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${ssoToken}` },
          });
          if (res.ok) {
            setToken(ssoToken);
            setUser(await res.json());
          }
        } catch { /* network error */ }
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearCookie('cariara_sso');
    window.location.href = ASCEND_URL;
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, isLoading, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
