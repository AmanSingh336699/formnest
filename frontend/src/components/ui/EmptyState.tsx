import type { ReactNode, ComponentType } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-brand-50 p-3">
          <Icon className="h-6 w-6 text-brand-600" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
