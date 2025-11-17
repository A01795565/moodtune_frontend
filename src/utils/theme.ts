export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'moodtune-theme';

const isThemeMode = (value: string | null | undefined): value is ThemeMode =>
  value === 'light' || value === 'dark';

const readStoredTheme = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(stored) ? stored : null;
};

const readSystemTheme = (): ThemeMode => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const getThemeFromDom = (): ThemeMode | null => {
  if (typeof document === 'undefined') return null;
  const current = document.documentElement.dataset.theme;
  return isThemeMode(current) ? current : null;
};

export const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
};

export const persistTheme = (theme: ThemeMode) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const getInitialTheme = (): ThemeMode =>
  getThemeFromDom() ?? readStoredTheme() ?? readSystemTheme();

export const ensureInitialTheme = (): ThemeMode => {
  const theme = getInitialTheme();
  applyThemeToDocument(theme);
  return theme;
};


