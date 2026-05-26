import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UiState {
  sidebarCollapsed: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setSidebar: (collapsed: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>((set) => {
  const savedTheme = localStorage.getItem('formnest-theme') as Theme | null;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme: Theme = savedTheme || (systemDark ? 'dark' : 'light');

  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    sidebarCollapsed: false,
    theme: initialTheme,
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
    setTheme: (theme) => {
      localStorage.setItem('formnest-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme });
    },
    toggleTheme: () => set((s) => {
      const newTheme = s.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('formnest-theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: newTheme };
    }),
  };
});
