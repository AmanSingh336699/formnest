import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, User, CreditCard, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/uiStore';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/forms', label: 'Forms', icon: FileText },
  { to: '/account/profile', label: 'Profile', icon: User },
  { to: '/account/billing', label: 'Billing', icon: CreditCard },
];

export function Sidebar(): JSX.Element {
  const { mobileSidebarOpen, setMobileSidebar } = useUiStore();

  const navContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 transition-colors duration-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold text-white shadow-sm dark:bg-brand-500">F</div>
          <span className="text-base font-semibold text-slate-950 dark:text-white">FormNest</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileSidebar(false)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileSidebar(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 md:flex" aria-label="Primary Desktop">
        {navContent}
      </aside>

      {/* Mobile Slide-Over Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebar(false)}
          />
          <aside className="relative flex w-72 max-w-[80vw] flex-col bg-white shadow-2xl transition-all dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 animate-slide-right">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
