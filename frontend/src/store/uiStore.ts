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
  const storedTheme = localStorage.getItem('formnest-theme');
  const savedTheme: Theme | null = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme: Theme = savedTheme || (systemDark ? 'dark' : 'light');

  applyTheme(initialTheme);

  return {
    sidebarCollapsed: false,
    theme: initialTheme,
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
    setTheme: (theme) => {
      localStorage.setItem('formnest-theme', theme);
      applyTheme(theme);
      set({ theme });
    },
    toggleTheme: () => set((s) => {
      const newTheme = s.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('formnest-theme', newTheme);
      applyTheme(newTheme);
      return { theme: newTheme };
    }),
  };
});

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}
