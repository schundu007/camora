import { useState, useEffect, useCallback } from 'react';

/**
 * Theme system. The CSS implementation lives in globals.css:
 *
 *   :root { … light tokens … }
 *   [data-theme="dark"] { … dark overrides … }
 *
 * `useTheme` mirrors the user's choice into both `localStorage` (so it
 * persists) and the `data-theme` attribute on <html> (so every CSS
 * variable flips at once). All components that reference `var(--cam-*)`
 * or `var(--bg-*)` etc. switch automatically — no per-component logic.
 */

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'camora-theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  // Honor system preference on first paint when the user hasn't chosen.
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  // Keep the legacy `.light-theme` class in sync for any old consumer.
  if (theme === 'light') root.classList.add('light-theme');
  else root.classList.remove('light-theme');
  root.style.colorScheme = theme;
}

/**
 * Apply the persisted theme synchronously, before React hydrates, so
 * there's no flash of the wrong theme on first paint. Safe to call from
 * the entry module (main.tsx) outside of any React tree.
 */
export function bootstrapTheme(): void {
  applyTheme(readInitialTheme());
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch { /* Safari private mode */ }
  }, [theme]);

  // Sync across tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      if (e.newValue === 'dark' || e.newValue === 'light') setThemeState(e.newValue);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return { theme, setTheme, toggle } as const;
}
