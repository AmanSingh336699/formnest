import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Key, User, CreditCard, Webhook, BookOpen } from 'lucide-react';
import { cn } from '../../lib/cn';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/forms', label: 'Forms', icon: FileText },
  { to: '/developer/api-keys', label: 'API Keys', icon: Key },
  { to: '/developer/webhooks', label: 'Webhooks', icon: Webhook },
  { to: '/developer/api-docs', label: 'API Docs', icon: BookOpen },
  { to: '/account/profile', label: 'Profile', icon: User },
  { to: '/account/billing', label: 'Billing', icon: CreditCard },
];

export function Sidebar(): JSX.Element {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 md:flex" aria-label="Primary">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 transition-colors duration-200 dark:border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold shadow-sm dark:bg-brand-500">F</div>
        <span className="text-base font-semibold text-slate-950 dark:text-white">FormNest</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
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
    </aside>
  );
}
