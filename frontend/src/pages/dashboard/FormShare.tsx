import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Code2, Copy, Database, Send, Webhook } from 'lucide-react';
import { formsApi } from '../../api/services/forms.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { env } from '../../lib/env';
import { buildAutoResizeEmbedSnippet, buildEmbedUrl } from '../../lib/embed';

export function FormSharePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading } = useQuery({ queryKey: ['form', id], queryFn: () => formsApi.get(id as string), enabled: !!id });
  const { copy } = useCopyToClipboard();

  const slug = form?.customSlug ?? form?.slug ?? '';
  const publicUrl = `${env.appUrl}/f/${slug}`;
  const embedTheme = form?.theme
    ? {
        backgroundColor: form.theme.backgroundColor,
        textColor: form.theme.textColor,
        primaryColor: form.theme.primaryColor,
        buttonColor: form.theme.buttonColor,
        fontFamily: form.theme.fontFamily,
        borderRadius: form.theme.borderRadius,
      }
    : null;
  const embedUrl = slug ? buildEmbedUrl(publicUrl, embedTheme) : '';
  const embedSnippet = slug ? buildAutoResizeEmbedSnippet({ slug, publicUrl, theme: embedTheme }) : '';
  const reactSnippet = `import { useEffect, useRef } from 'react';

export function FormNestEmbed() {
  const iframeRef = useRef(null);

  useEffect(() => {
    function onMessage(event) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== 'formnest:resize' || event.data.slug !== '${slug}') return;
      iframeRef.current.style.height = Math.max(320, Number(event.data.height || 0)) + 'px';
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src="${embedUrl}"
      title="FormNest form"
      style={{ width: '100%', minHeight: 480, border: 0, display: 'block' }}
      loading="lazy"
    />
  );
}`;
  const submitSnippet = `await fetch('${env.apiUrl}/public/forms/${form?.id ?? ':formId'}/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify({
    answers: {
      field_id_here: 'customer@example.com',
    },
    loadedAt: Date.now() - 5000,
    submittedAt: Date.now(),
    referrer: window.location.href,
  }),
});`;
  const responseSnippet = `curl '${env.apiUrl}/forms/${form?.id ?? ':formId'}/responses?limit=25' \\
  -H 'Authorization: Bearer fn_your_api_key'`;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to={`/dashboard/forms/${id}`} className="rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Share "{form?.title ?? '...'}"</h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      ) : (
        <>
          <Card className="mb-4">
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Hosted form URL</h2>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={publicUrl}
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              <Button leftIcon={<Copy className="h-4 w-4" />} onClick={() => copy(publicUrl, 'Link copied')}>Copy</Button>
            </div>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-brand-600 hover:underline dark:text-brand-300">
              Open in new tab
            </a>
          </Card>

          <Card className="mb-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Responsive embed</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Drop this into any app. It auto-resizes and carries safe theme overrides in the URL.
                </p>
              </div>
              <Button variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => copy(embedSnippet, 'Snippet copied')}>
                Copy
              </Button>
            </div>
            <textarea
              readOnly
              rows={8}
              value={embedSnippet}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Supported URL overrides: backgroundColor, textColor, primaryColor, buttonColor, fontFamily, borderRadius.
            </p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">React embed</h2>
              </div>
              <textarea
                readOnly
                rows={14}
                value={reactSnippet}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              <Button className="mt-2" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => copy(reactSnippet, 'React snippet copied')}>
                Copy React
              </Button>
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Send className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Headless submit</h2>
              </div>
              <p className="mb-3 text-sm text-gray-500 dark:text-slate-400">
                Use your own UI and post answers directly to FormNest. Field keys are the field ids from the builder/API.
              </p>
              <textarea
                readOnly
                rows={13}
                value={submitSnippet}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              <Button className="mt-2" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => copy(submitSnippet, 'Submit example copied')}>
                Copy submit
              </Button>
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Webhook className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Send data to your DB</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                FormNest stores the canonical response, then sends signed response.created webhooks. Point a webhook at your backend and write the payload into your database.
              </p>
              <Link to="/developer/webhooks" className="mt-3 inline-flex text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
                Configure webhooks
              </Link>
            </Card>

            <Card>
              <div className="mb-3 flex items-center gap-2">
                <Database className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Fetch responses later</h2>
              </div>
              <textarea
                readOnly
                rows={4}
                value={responseSnippet}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => copy(responseSnippet, 'Response API example copied')}>
                  Copy API
                </Button>
                <Link to="/developer/api-keys" className="inline-flex h-10 items-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">
                  Manage API keys
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
