import { create } from 'zustand';

/** Viewer theme choice (plan §6.3): follow the OS, or force light/dark. */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'rastro.theme';

function readStored(): ThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Reflects the preference on <html data-theme> (CSS tokens key off it). */
export function applyTheme(pref: ThemePreference): void {
  const root = document.documentElement;
  if (pref === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', pref);
  }
}

/** True when the dark palette is currently in effect. */
export function isDarkActive(pref: ThemePreference): boolean {
  if (pref !== 'system') {
    return pref === 'dark';
  }
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

/**
 * Per-viewer theme preference. Stored in localStorage as a convenience only
 * (wrapped in try/catch — private windows may block storage).
 */
export const useThemeStore = create<ThemeState>((set) => ({
  preference: typeof window === 'undefined' ? 'system' : readStored(),
  setPreference: (preference) => {
    try {
      if (preference === 'system') {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, preference);
      }
    } catch {
      // Storage unavailable: the choice still applies for this session.
    }
    applyTheme(preference);
    set({ preference });
  },
}));
