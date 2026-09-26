import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { authApi } from '../../api/services/auth.service';
import { Badge } from '../ui/Badge';
import { LogOut, Sun, Moon, Menu } from 'lucide-react';

export function Topbar(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const { theme, toggleTheme, toggleMobileSidebar } = useUiStore();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      clear();
      navigate('/login');
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 truncate text-sm font-medium text-slate-600 dark:text-slate-300">
          {user?.email}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {user && <Badge variant={user.plan === 'FREE' ? 'neutral' : 'default'}>{user.plan}</Badge>}
        
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
