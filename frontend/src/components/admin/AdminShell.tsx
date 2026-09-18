import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, ArrowLeft, LogOut, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { authApi } from '../../api/services/auth.service';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/cn';

const ADMIN_NAV = [
  { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users & Accounts', icon: Users },
  { to: '/admin/forms', label: 'All Forms', icon: FileText },
];

export function AdminShell(): JSX.Element {
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
    <div className="flex h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Admin Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-indigo-200 bg-indigo-900 text-indigo-100 transition-colors duration-200 dark:border-indigo-950 dark:bg-indigo-950 md:flex" aria-label="Admin Navigation">
        <div className="flex h-16 items-center gap-2 border-b border-indigo-850 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white font-bold shadow-md">A</div>
          <span className="text-base font-semibold tracking-wide text-white">FormNest Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white dark:hover:bg-indigo-900/60',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-indigo-850 p-4">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-850 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to User App</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded">Admin Session</span>
            <div className="hidden sm:inline-block text-sm font-medium text-slate-500 dark:text-slate-400 truncate max-w-xs">{user?.email}</div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="danger">ADMIN</Badge>

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

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
