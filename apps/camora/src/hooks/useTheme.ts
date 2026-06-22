/**
 * Theme system. The CSS implementation lives in globals.css:
 *
 *   :root { … dark tokens (default) … }
 *   [data-theme="light"] { … light overrides … }
 *
 * All components call useTheme() which reads from ThemeContext — one
 * shared state so toggle() in any component propagates to all others
 * immediately without a page refresh.
 *
 * bootstrapTheme() is called synchronously in main.tsx before React
 * hydrates to avoid a flash of the wrong theme on first paint.
 */

export { useThemeContext as useTheme } from '../contexts/ThemeContext';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'camora-theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  return 'dark';
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'light') root.classList.add('light-theme');
  else root.classList.remove('light-theme');
  root.style.colorScheme = theme;
}

export function bootstrapTheme(): void {
  applyTheme(readInitialTheme());
}
