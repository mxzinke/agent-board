import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('agent-board-theme') as Theme) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function apply() {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', isDark);
    }

    apply();
    media.addEventListener('change', apply);
    localStorage.setItem('agent-board-theme', theme);

    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return { theme, setTheme: setThemeState };
}
