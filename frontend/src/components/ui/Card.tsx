import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ children, className, padded = true }: CardProps): JSX.Element {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', padded && 'p-6', className)}>{children}</div>
  );
}
