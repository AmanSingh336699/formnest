import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <div className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-slate-700', className)} />;
}
