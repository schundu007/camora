import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'camora-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-theme');
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('light-theme');
      root.style.colorScheme = 'dark';
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggle } as const;
}
