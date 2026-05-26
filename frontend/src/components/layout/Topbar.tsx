import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { authApi } from '../../api/services/auth.service';
import { Badge } from '../ui/Badge';
import { LogOut, Sun, Moon } from 'lucide-react';

export function Topbar(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const { theme, toggleTheme } = useUiStore();
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
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 px-6 transition-colors duration-200">
      <div className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
      <div className="flex items-center gap-3">
        {user && <Badge variant={user.plan === 'FREE' ? 'neutral' : 'default'}>{user.plan}</Badge>}
        
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
