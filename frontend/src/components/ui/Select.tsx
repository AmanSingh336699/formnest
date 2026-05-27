import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helpText?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helpText, error, options, id, required, ...props }, ref) => {
    const inputId = id ?? `sel-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-slate-200">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm',
            'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-400',
            error && 'border-red-400',
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : helpText ? (
          <p className="text-xs text-gray-500 dark:text-slate-400">{helpText}</p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = 'Select';
