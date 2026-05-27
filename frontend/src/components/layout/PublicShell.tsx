import { Link, Outlet } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

export function PublicShell(): JSX.Element {
  const { theme, toggleTheme } = useUiStore();

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold dark:bg-brand-500">F</div>
            <span className="text-base font-semibold text-gray-900 dark:text-white">FormNest</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-slate-300">
            <Link to="/pricing" className="transition-colors hover:text-gray-900 dark:hover:text-white">Pricing</Link>
            <Link to="/login" className="transition-colors hover:text-gray-900 dark:hover:text-white">Login</Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-pressed={theme === 'dark'}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/register" className="rounded-lg bg-brand-600 px-3 py-1.5 text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400">Sign up</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-gray-100 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-gray-500 dark:text-slate-400">
          (c) {new Date().getFullYear()} FormNest. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
