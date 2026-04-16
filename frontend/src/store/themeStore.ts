import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

const savedTheme = (localStorage.getItem('toefl_theme') as Theme) || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: savedTheme,

  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('toefl_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),

  setTheme: (theme) => {
    localStorage.setItem('toefl_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));
