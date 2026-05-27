import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Copy } from 'lucide-react';
import { formsApi } from '../../api/services/forms.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { env } from '../../lib/env';

export function FormSharePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading } = useQuery({ queryKey: ['form', id], queryFn: () => formsApi.get(id as string), enabled: !!id });
  const { copy } = useCopyToClipboard();

  const slug = form?.customSlug ?? form?.slug ?? '';
  const publicUrl = `${env.appUrl}/f/${slug}`;
  const embedSnippet = `<iframe src="${publicUrl}?embed=1" style="width:100%;border:none;" id="formnest-${slug}"></iframe>
<script>
  window.addEventListener('message', function(e) {
    if (e.data.type === 'formnest:resize') {
      document.getElementById('formnest-${slug}').style.height = e.data.height + 'px';
    }
  });
</script>`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to={`/dashboard/forms/${id}`} className="rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Share "{form?.title ?? '...'}"</h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      ) : (
        <>
          <Card className="mb-4">
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Public link</h2>
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
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">QR code</h2>
            <div className="flex items-center gap-4">
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-600 dark:bg-white">
                <QRCodeSVG value={publicUrl} size={160} />
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Scan to open this form on a mobile device. Perfect for in-person events.
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Embed</h2>
            <textarea
              readOnly
              rows={8}
              value={embedSnippet}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
            <Button className="mt-2" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => copy(embedSnippet, 'Snippet copied')}>
              Copy embed code
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
