import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helpText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helpText, error, id, required, ...props }, ref) => {
    const inputId = id ?? `ta-${Math.random().toString(36).slice(2, 9)}`;
    const describedBy = error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-slate-200">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          rows={4}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
            'placeholder:text-gray-400 shadow-sm',
            'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            'dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400',
            error && 'border-red-400',
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : helpText ? (
          <p id={`${inputId}-help`} className="text-xs text-gray-500 dark:text-slate-400">{helpText}</p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
