import type { ReactNode, ComponentType } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
      {Icon && (
        <div className="mb-4 rounded-full bg-brand-50 p-3 dark:bg-brand-500/15">
          <Icon className="h-6 w-6 text-brand-600 dark:text-brand-300" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
