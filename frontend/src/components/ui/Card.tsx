import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ children, className, padded = true }: CardProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm transition-colors',
        'dark:border-slate-700 dark:bg-slate-900 dark:shadow-none',
        padded && 'p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
