/**
 * Renders a single FormField for live preview AND public submission.
 * Single source of truth — preview === submission UI.
 */
import { type ChangeEvent } from 'react';
import { cn } from '../../lib/cn';
import type { FormField } from '../../types';
import { Star, Heart, ThumbsUp } from 'lucide-react';

export interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  primaryColor?: string;
}

export function FieldRenderer({ field, value, onChange, onFocus, error, disabled, primaryColor }: FieldRendererProps): JSX.Element | null {
  const inputId = `field-${field.id}`;
  const describedBy = error ? `${inputId}-error` : field.helpText ? `${inputId}-help` : undefined;

  const baseInput = cn(
    'block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors',
    'placeholder:text-gray-400 focus:outline-none focus:ring-2',
    error ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'focus:border-brand-500 focus:ring-brand-500/20',
    disabled && 'bg-gray-50 cursor-not-allowed',
  );

  function renderInput(): JSX.Element | null {
    switch (field.type) {
      case 'TEXT_SHORT':
      case 'EMAIL':
      case 'PHONE':
        return (
          <input
            id={inputId}
            type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'}
            value={(value as string) ?? ''}
            placeholder={field.placeholder ?? ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            onFocus={onFocus}
            disabled={disabled}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            maxLength={field.validation?.maxLength ?? 500}
            className={baseInput}
          />
        );

      case 'TEXT_LONG':
        return (
          <textarea
            id={inputId}
            rows={4}
            value={(value as string) ?? ''}
            placeholder={field.placeholder ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            disabled={disabled}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            maxLength={field.validation?.maxLength ?? 5000}
            className={baseInput}
          />
        );

      case 'NUMBER':
        return (
          <input
            id={inputId}
            type="number"
            value={(value as number | undefined) ?? ''}
            placeholder={field.placeholder ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            onFocus={onFocus}
            disabled={disabled}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.validation?.step ?? (field.validation?.integerOnly ? 1 : 'any')}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={baseInput}
          />
        );

      case 'DATE':
        return (
          <input
            id={inputId}
            type="date"
            value={(value as string) ?? ''}
            min={field.validation?.minDate}
            max={field.validation?.maxDate}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            disabled={disabled}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={baseInput}
          />
        );

      case 'RADIO': {
        const choices = field.options?.choices ?? [];
        return (
          <div role="radiogroup" aria-labelledby={`${inputId}-label`} className="space-y-2">
            {choices.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
                <input
                  type="radio"
                  name={inputId}
                  value={c.value}
                  checked={value === c.value}
                  onChange={() => onChange(c.value)}
                  onFocus={onFocus}
                  disabled={disabled}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">{c.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'CHECKBOX': {
        const choices = field.options?.choices ?? [];
        const arrayValue = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="space-y-2">
            {choices.map((c) => {
              const checked = arrayValue.includes(c.value);
              return (
                <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    value={c.value}
                    checked={checked}
                    onChange={() => {
                      onChange(checked ? arrayValue.filter((v) => v !== c.value) : [...arrayValue, c.value]);
                    }}
                    onFocus={onFocus}
                    disabled={disabled}
                    className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{c.label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'DROPDOWN': {
        const choices = field.options?.choices ?? [];
        return (
          <select
            id={inputId}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            onFocus={onFocus}
            disabled={disabled}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={baseInput}
          >
            <option value="">{field.placeholder ?? 'Select...'}</option>
            {choices.map((c) => (
              <option key={c.id} value={c.value}>{c.label}</option>
            ))}
          </select>
        );
      }

      case 'RATING': {
        const max = field.options?.ratingMax ?? 5;
        const type = field.options?.ratingType ?? 'stars';
        const current = (value as number) ?? 0;
        const Icon = type === 'hearts' ? Heart : type === 'thumbs' ? ThumbsUp : Star;
        return (
          <div role="radiogroup" aria-labelledby={`${inputId}-label`} className="flex items-center gap-1.5">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                onFocus={onFocus}
                disabled={disabled}
                aria-label={`Rate ${n} of ${max}`}
                aria-pressed={current === n}
                className="rounded p-1 transition-colors hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Icon
                  className={cn('h-7 w-7 transition-colors', n <= current ? 'fill-amber-400 text-amber-400' : 'text-gray-300')}
                />
              </button>
            ))}
          </div>
        );
      }

      case 'YES_NO': {
        return (
          <div role="radiogroup" className="flex gap-3">
            {[
              { label: 'Yes', val: true },
              { label: 'No', val: false },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => onChange(opt.val)}
                onFocus={onFocus}
                disabled={disabled}
                aria-pressed={value === opt.val}
                className={cn(
                  'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                  value === opt.val
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }

      case 'HEADING':
        return null;

      case 'DIVIDER':
        return null;

      default: {
        const _exhaustive: never = field.type;
        void _exhaustive;
        return null;
      }
    }
  }

  if (field.type === 'HEADING') {
    return (
      <div className="border-b border-gray-200 pb-2 pt-2">
        <h2 className="text-lg font-semibold" style={primaryColor ? { color: primaryColor } : undefined}>{field.label}</h2>
        {field.helpText && <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>}
      </div>
    );
  }

  if (field.type === 'DIVIDER') {
    return <hr className="my-2 border-gray-200" />;
  }

  return (
    <div className="space-y-2">
      <label id={`${inputId}-label`} htmlFor={inputId} className="block text-sm font-medium text-gray-900">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
      </label>
      {field.helpText && (
        <p id={`${inputId}-help`} className="text-xs text-gray-500">{field.helpText}</p>
      )}
      {renderInput()}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
