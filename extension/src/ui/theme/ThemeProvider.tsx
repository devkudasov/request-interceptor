import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Theme } from '@/shared/types';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyThemeClass(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Load theme from storage on mount
  useEffect(() => {
    chrome.storage.local.get('settings', (result) => {
      const saved = result.settings?.theme as Theme | undefined;
      if (saved) {
        setThemeState(saved);
        const resolved = resolveTheme(saved);
        setResolvedTheme(resolved);
        applyThemeClass(resolved);
      }
    });
  }, []);

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Listen for storage changes (sync theme across popup/sidepanel)
  useEffect(() => {
    const handler = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.settings?.newValue?.theme) {
        const newTheme = changes.settings.newValue.theme as Theme;
        setThemeState(newTheme);
        const resolved = resolveTheme(newTheme);
        setResolvedTheme(resolved);
        applyThemeClass(resolved);
      }
    };

    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);

    // Persist to storage
    chrome.storage.local.get('settings', (result) => {
      chrome.storage.local.set({
        settings: { ...result.settings, theme: newTheme },
      });
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
