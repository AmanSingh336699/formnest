/**
 * Renders the full form. Validates client-side then exposes onSubmit.
 * Used by FormBuilder live preview AND PublicFormView.
 */
import { useState, useCallback, type FormEvent } from 'react';
import type { Form } from '../../types';
import { FieldRenderer } from './FieldRenderer';
import { Button } from '../ui/Button';
import { validateAnswers, type ValidationErrors } from '../../lib/formValidation';

interface FormRendererProps {
  form: Form;
  initialAnswers?: Record<string, unknown>;
  onFieldFocus?: (fieldId: string) => void;
  onSubmit: (answers: Record<string, unknown>) => Promise<void> | void;
  submitting?: boolean;
  isPreview?: boolean;
  branding?: boolean;
}

export function FormRenderer({ form, initialAnswers, onFieldFocus, onSubmit, submitting, isPreview, branding }: FormRendererProps): JSX.Element {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers ?? {});
  const [errors, setErrors] = useState<ValidationErrors>({});

  const updateAnswer = useCallback((fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const copy = { ...prev };
      delete copy[fieldId];
      return copy;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const validation = validateAnswers(form.fields, answers);
      if (!validation.ok) {
        setErrors(validation.errors);
        // Focus first error field
        const firstErrId = Object.keys(validation.errors)[0];
        if (firstErrId) {
          document.getElementById(`field-${firstErrId}`)?.focus();
        }
        return;
      }
      setErrors({});
      await onSubmit(answers);
    },
    [answers, form.fields, onSubmit],
  );

  const theme = form.theme ?? {};
  const radius = theme.borderRadius === 'sharp' ? 'rounded-none' : theme.borderRadius === 'pill' ? 'rounded-full' : 'rounded-lg';

  const style: React.CSSProperties = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: theme.fontFamily,
  };

  return (
    <div className="min-h-full" style={style}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-6 sm:p-8">
        {/* Honeypot — hidden, must remain empty */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}>
          <label>
            Leave this field blank
            <input
              type="text"
              name="email_address_verify"
              tabIndex={-1}
              autoComplete="off"
              onChange={(e) => updateAnswer('__honeypot', e.target.value)}
            />
          </label>
        </div>

        {theme.logoUrl && (
          <div className="flex justify-center">
            <img src={theme.logoUrl} alt="" className="h-12 max-w-[180px] object-contain" />
          </div>
        )}

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold sm:text-3xl">{form.title}</h1>
          {form.description && <p className="text-base text-gray-600">{form.description}</p>}
        </header>

        <div className="space-y-5">
          {form.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={(v) => updateAnswer(field.id, v)}
              onFocus={() => onFieldFocus?.(field.id)}
              error={errors[field.id]}
              disabled={submitting}
              primaryColor={theme.primaryColor}
            />
          ))}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            loading={submitting}
            fullWidth
            className={radius}
            style={theme.buttonColor ? { backgroundColor: theme.buttonColor } : undefined}
          >
            {isPreview ? 'Submit (preview)' : 'Submit'}
          </Button>
        </div>

        {branding !== false && (
          <p className="pt-4 text-center text-xs text-gray-400">
            Powered by{' '}
            <a href="https://formnest.com" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:underline">
              FormNest
            </a>
          </p>
        )}
      </form>
    </div>
  );
}
