import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicApi } from '../../api/services/public.service';
import { FormRenderer } from '../../components/renderer/FormRenderer';
import { Skeleton } from '../../components/ui/Skeleton';
import { mergeEmbedTheme } from '../../lib/embed';
import type { Form } from '../../types';

function generateIdempotencyKey(): string {
  return `pub_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

export function PublicFormViewPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const isEmbed = params.get('embed') === '1';
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [submitted, setSubmitted] = useState<{ message: string; branding: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const loadedAtRef = useRef<number>(Date.now());
  const startedRef = useRef(false);
  const idempotencyKey = useRef(generateIdempotencyKey()).current;
  const renderForm = useMemo<Form | null>(() => {
    if (!form) return null;
    return isEmbed ? { ...form, theme: mergeEmbedTheme(form.theme, params) } : form;
  }, [form, isEmbed, params]);

  useEffect(() => {
    if (!slug) return;
    publicApi
      .getBySlug(slug)
      .then((f) => setForm(f))
      .catch((err) => {
        const code = err?.response?.data?.error?.code ?? 'NOT_FOUND';
        const message = err?.response?.data?.error?.message ?? "We couldn't find this form.";
        setError({ code, message });
      });
  }, [slug]);

  // Auto-resize for embed via postMessage
  useEffect(() => {
    if (!isEmbed) return;
    function sendHeight(): void {
      const h = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'formnest:resize', formId: form?.id ?? null, slug: slug ?? null, height: h }, '*');
    }
    sendHeight();
    const ro = new ResizeObserver(sendHeight);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [isEmbed, form, slug, submitted]);

  function handleFieldFocus(): void {
    if (startedRef.current || !form) return;
    startedRef.current = true;
    void publicApi.trackStart(form.id);
  }

  async function handleSubmit(answers: Record<string, unknown>): Promise<void> {
    if (!form) return;
    setSubmitting(true);
    try {
      const honeypot = answers.__honeypot;
      delete answers.__honeypot;
      const result = await publicApi.submit(
        form.id,
        {
          answers,
          loadedAt: loadedAtRef.current,
          submittedAt: Date.now(),
          email_address_verify: typeof honeypot === 'string' ? honeypot : '',
        },
        idempotencyKey,
      );
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setSubmitted({
        message: result.successMessage ?? 'Thanks! Your response has been recorded.',
        branding: result.branding,
      });
    } catch (err) {
      const message = (err as { message?: string })?.message ?? 'Submission failed';
      setError({ code: 'SUBMIT_ERROR', message });
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            {error.code === 'FORM_CLOSED' ? 'This form is closed' : error.code === 'NOT_FOUND' || error.code === 'FORM_NOT_FOUND' ? 'Form not found' : 'Something went wrong'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!form || !renderForm) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Thank you!</h1>
          <p className="mt-2 text-gray-600">{submitted.message}</p>
          {submitted.branding && (
            <p className="mt-8 text-xs text-gray-400">
              Powered by{' '}
              <a href="https://formnest.com" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">FormNest</a>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={isEmbed ? '' : 'min-h-screen bg-gray-50'}>
      <FormRenderer
        form={renderForm}
        onSubmit={handleSubmit}
        onFieldFocus={handleFieldFocus}
        submitting={submitting}
        branding={form.settings?.showBranding !== false}
      />
    </div>
  );
}
