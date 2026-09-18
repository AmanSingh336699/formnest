import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, ExternalLink, Globe, Inbox, Share2, Sparkles } from 'lucide-react';
import { formsApi } from '../../api/services/forms.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { env } from '../../lib/env';

export function FormSharePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsApi.get(id as string),
    enabled: !!id,
  });
  const { copy } = useCopyToClipboard();

  const slug = form?.customSlug ?? form?.slug ?? '';
  const publicUrl = `${env.appUrl}/f/${slug}`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/dashboard/forms/${id}`}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Share "{form?.title ?? '...'}"
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Get the link and start collecting responses instantly
            </p>
          </div>
        </div>

        {slug && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex"
          >
            <Button variant="outline" rightIcon={<ExternalLink className="h-4 w-4" />}>
              Open Form Live
            </Button>
          </a>
        )}
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400">Loading form details...</Card>
      ) : (
        <div className="space-y-6">
          {/* Main Share Link Card */}
          <Card className="border-brand-200 dark:border-brand-500/30 bg-gradient-to-br from-white to-brand-50/30 dark:from-slate-900 dark:to-slate-900/80 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Public Form URL
              </h2>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Copy this link and share it anywhere. Anyone with this link can fill and submit your form.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                readOnly
                value={publicUrl}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-800 shadow-inner focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <div className="flex items-center gap-2">
                <Button
                  leftIcon={<Copy className="h-4 w-4" />}
                  onClick={() => copy(publicUrl, 'Link copied to clipboard!')}
                  className="flex-1 sm:flex-none"
                >
                  Copy Link
                </Button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:hidden flex-1"
                >
                  <Button variant="outline" fullWidth rightIcon={<ExternalLink className="h-4 w-4" />}>
                    Open
                  </Button>
                </a>
              </div>
            </div>
          </Card>

          {/* Step-by-Step Instructions Guide */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                How to collect & test responses
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-sm mb-3">
                  1
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Share2 className="h-4 w-4 text-indigo-500" />
                  Share the Link
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Send your link via Email, WhatsApp, Social Media, or add it to your website or bio.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-sm mb-3">
                  2
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <ExternalLink className="h-4 w-4 text-emerald-500" />
                  Test Live Form
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Click "Open Form Live" to open a new tab and submit a test entry yourself.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-sm mb-3">
                  3
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Inbox className="h-4 w-4 text-blue-500" />
                  View Responses
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  All submitted answers and uploaded files will appear immediately in your form's Responses tab.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Link to={`/dashboard/forms/${id}/responses`}>
                <Button variant="ghost" size="sm" rightIcon={<Inbox className="h-4 w-4" />}>
                  Go to Form Responses
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
