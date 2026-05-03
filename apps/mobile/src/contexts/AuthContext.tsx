import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { CAPRA_API_URL, WEB_APP_URL } from '@/lib/env';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'camora.access_token';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  onboarding_completed?: boolean;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => {},
  signOut: async () => {},
});

function normalizeUser(raw: any): AuthUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const image = (raw.image && String(raw.image).trim()) || (raw.picture && String(raw.picture).trim()) || undefined;
  return { ...raw, image };
}

async function fetchMe(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${CAPRA_API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeUser(data.user ?? data);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistToken = useCallback(async (next: string | null) => {
    setToken(next);
    if (next) await SecureStore.setItemAsync(TOKEN_KEY, next);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  const hydrateFromToken = useCallback(async (candidate: string) => {
    const profile = await fetchMe(candidate);
    if (!profile) {
      await persistToken(null);
      setUser(null);
      return;
    }
    await persistToken(candidate);
    setUser(profile);
  }, [persistToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (cancelled) return;
      if (stored) await hydrateFromToken(stored);
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hydrateFromToken]);

  // Deep-link handler. The web handoff page (to be added at
  // ${WEB_APP_URL}/mobile/auth) should redirect to:
  //   camora://auth?token=<jwt>
  // after a successful Google OAuth round-trip. Until that page exists,
  // signIn() opens the regular web login and a manual paste flow can be
  // added later.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.hostname === 'auth' || parsed.path === 'auth') {
        const t = parsed.queryParams?.token;
        if (typeof t === 'string' && t.length > 0) {
          void hydrateFromToken(t);
        }
      }
    });
    return () => sub.remove();
  }, [hydrateFromToken]);

  const signIn = useCallback(async () => {
    const redirect = Linking.createURL('auth');
    const url = `${WEB_APP_URL}/mobile/auth?redirect=${encodeURIComponent(redirect)}`;
    await WebBrowser.openAuthSessionAsync(url, redirect);
  }, []);

  const signOut = useCallback(async () => {
    await persistToken(null);
    setUser(null);
  }, [persistToken]);

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isLoading,
      isAuthenticated: !!token && !!user,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
