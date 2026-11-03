'use client';

import { useCallback, useState } from 'react';

import { THEME_KEY as KEY } from './theme-script';

export type Theme = 'light' | 'dark';

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        window.localStorage.setItem(KEY, next);
      } catch {
        // Blocked storage only means the choice lasts until the page closes.
      }
      return next;
    });
  }, []);
  return { theme, toggle };
}
