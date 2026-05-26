import { env } from '../../lib/env';

export function ApiDocsPage(): JSX.Element {
  const specUrl = `${env.apiUrl}/openapi.json`;
  // Use Scalar CDN via simple HTML iframe technique
  const scalarHtml = `<!doctype html>
<html><head><meta charset="utf-8"/><title>FormNest API Docs</title>
<style>body{margin:0;font-family:Inter,sans-serif}</style>
</head><body>
<script id="api-reference" data-url="${specUrl}"></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body></html>`;
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(scalarHtml)}`;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">API Documentation</h1>
        <p className="mt-0.5 text-sm text-gray-500">Auto-generated from our OpenAPI 3.1 spec.</p>
      </div>
      <iframe title="API Reference" src={dataUrl} className="flex-1 w-full border-0" />
    </div>
  );
}
