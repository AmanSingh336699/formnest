import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Code2,
  Database,
  KeyRound,
  Layers3,
  RadioTower,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { env } from '../../lib/env';
import { cn } from '../../lib/cn';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface EndpointDoc {
  method: Method;
  path: string;
  auth: 'No API key' | 'API key';
  purpose: string;
  scope?: string;
}

const endpoints: EndpointDoc[] = [
  { method: 'GET', path: '/public/forms/{slug}', auth: 'No API key', purpose: 'Load a published form definition for embed or custom app rendering.' },
  { method: 'POST', path: '/public/forms/{formId}/submit', auth: 'No API key', purpose: 'Create a response from an embedded form or developer-owned intake UI.' },
  { method: 'GET', path: '/forms', auth: 'API key', scope: 'forms:read', purpose: 'List forms owned by the account.' },
  { method: 'POST', path: '/forms', auth: 'API key', scope: 'forms:write', purpose: 'Create forms programmatically.' },
  { method: 'PATCH', path: '/forms/{id}', auth: 'API key', scope: 'forms:write', purpose: 'Update title, fields, theme, settings, or custom slug.' },
  { method: 'POST', path: '/forms/{id}/publish', auth: 'API key', scope: 'forms:write', purpose: 'Publish a form so it can receive app or embed intake traffic.' },
  { method: 'GET', path: '/forms/{id}/responses', auth: 'API key', scope: 'responses:read', purpose: 'Backfill, reconcile, export, or build an internal dashboard.' },
  { method: 'GET', path: '/responses/{id}', auth: 'API key', scope: 'responses:read', purpose: 'Fetch one response with normalized answers.' },
  { method: 'POST', path: '/forms/{id}/webhooks', auth: 'API key', scope: 'webhooks:manage', purpose: 'Send new response events to your backend.' },
  { method: 'GET', path: '/webhooks/{id}/deliveries', auth: 'API key', scope: 'webhooks:manage', purpose: 'Audit delivery attempts, failures, and retry state.' },
];

const methodClasses: Record<Method, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
  PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
};

const submitExample = `await fetch('${env.apiUrl}/public/forms/:formId/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID()
  },
  body: JSON.stringify({
    answers: {
      field_email: 'customer@example.com',
      field_plan: 'pro'
    },
    loadedAt: Date.now() - 5000,
    submittedAt: Date.now(),
    referrer: window.location.href
  })
});`;

const responsePayload = `{
  "id": "resp_123",
  "event": "response.created",
  "createdAt": "2026-05-27T10:15:30.000Z",
  "data": {
    "formId": "form_123",
    "formTitle": "Lead capture",
    "answers": [
      {
        "fieldId": "field_email",
        "fieldType": "EMAIL",
        "value": "customer@example.com"
      }
    ]
  }
}`;

const webhookReceiver = `import express from 'express';
import crypto from 'node:crypto';

const app = express();

app.post('/formnest/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.header('X-FormNest-Signature') || '';
  const payload = req.body.toString('utf8');
  const parts = Object.fromEntries(signature.split(',').map((part) => part.split('=')));
  const signed = parts.t + '.' + payload;
  const expected = crypto.createHmac('sha256', process.env.FORMNEST_WEBHOOK_SECRET)
    .update(signed)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(parts.v1 || '', 'hex');

  if (!parts.t || !parts.v1 || expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return res.sendStatus(400);
  }

  const event = JSON.parse(payload);
  // Upsert by event.id or response id so retries stay idempotent.
  // await db.leads.upsert({ where: { responseId: event.id }, create: ... });
  return res.sendStatus(204);
});`;

const fetchResponses = `curl '${env.apiUrl}/forms/:formId/responses?limit=25&page=1' \\
  -H 'Authorization: Bearer fn_your_api_key'`;

function CodeBlock({ title, code }: { title: string; code: string }): JSX.Element {
  const { copy } = useCopyToClipboard();

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-slate-950 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-3 py-2">
        <div className="min-w-0 text-xs font-medium text-slate-300">{title}</div>
        <button
          type="button"
          onClick={() => copy(code, 'Copied')}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Clipboard className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>
      <pre className="max-h-96 overflow-auto p-4 text-xs leading-5 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: Method }): JSX.Element {
  return (
    <span className={cn('inline-flex w-16 justify-center rounded-md px-2 py-1 text-xs font-semibold', methodClasses[method])}>
      {method}
    </span>
  );
}

export function ApiDocsPage(): JSX.Element {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-950">
      <div className="border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="info">Developer docs</Badge>
              <Badge variant="neutral">API v1</Badge>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">FormNest API Documentation</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-slate-300">
              Build forms in FormNest, embed them in any app, submit from your own UI, sync responses to your database, and use the API for automation, backfills, and dashboards.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-5">
        <main className="space-y-6">
          <section id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: Layers3,
                title: 'Hosted or embedded form',
                body: 'Fastest path. Use the public link or responsive iframe when FormNest should own the UI and validation.',
              },
              {
                icon: Code2,
                title: 'Headless submit',
                body: 'Use your own React, Next.js, mobile, or server UI and create responses through the intake endpoint.',
              },
              {
                icon: Webhook,
                title: 'Webhook sync',
                body: 'Best way to move each new response into your database without polling.',
              },
              {
                icon: Database,
                title: 'Response API',
                body: 'Use for backfills, reconciliation, exports, support tools, and internal dashboards.',
              },
            ].map((item) => (
              <Card key={item.title} className="h-full">
                <item.icon className="mb-3 h-5 w-5 text-brand-600 dark:text-brand-300" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{item.body}</p>
              </Card>
            ))}
          </section>

          <section id="webhook-vs-api">
            <Card>
              <div className="mb-5 flex items-start gap-3">
                <RadioTower className="mt-0.5 h-5 w-5 text-brand-600 dark:text-brand-300" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Webhook vs Response API</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-slate-300">
                    Agar developer webhook se response apne DB me store kar raha hai, normal product screen ke liye usko apne DB se hi read karna chahiye. Response API ko hot path polling ke liye use karna unnecessary hai.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Use webhooks for</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300">
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />Writing leads/orders/tickets into your DB.</li>
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />Triggering emails, CRM syncs, workflows, and queues.</li>
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />Near real-time response processing without polling.</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Use API fetch for</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300">
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />Backfill if a webhook endpoint was down.</li>
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />Reconciliation between FormNest and your DB.</li>
                    <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />Admin dashboards, exports, support, and audits.</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-400/40 dark:bg-brand-400/10">
                  <h3 className="text-sm font-semibold text-brand-900 dark:text-brand-100">Senior recommendation</h3>
                  <p className="mt-3 text-sm leading-6 text-brand-950 dark:text-slate-100">
                    Keep FormNest as the source of truth for collection and validation. Mirror into your DB through webhooks. Do not poll the response API every few seconds; use it only for recovery and operator workflows.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section id="quick-start" className="grid gap-4 xl:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Submit from custom UI</h2>
              </div>
              <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-slate-300">
                The response intake endpoint does not need an API key. Keep the idempotency key stable per browser submit attempt so double clicks and retries do not create duplicate responses.
              </p>
              <CodeBlock title="Browser or server submit" code={submitExample} />
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-2">
                <Webhook className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Webhook payload</h2>
              </div>
              <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-slate-300">
                Webhooks send response.created with normalized field ids and values. Store by response id to make retries idempotent.
              </p>
              <CodeBlock title="response.created" code={responsePayload} />
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Verify webhook signature</h2>
              </div>
              <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-slate-300">
                FormNest signs the raw body with X-FormNest-Signature using t=timestamp,v1=hmac. Reject stale or invalid signatures before touching your DB.
              </p>
              <CodeBlock title="Node/Express receiver" code={webhookReceiver} />
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Fetch responses when needed</h2>
              </div>
              <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-slate-300">
                Use the API key flow for controlled server-side jobs only. Never expose fn_ keys in browser or mobile clients.
              </p>
              <CodeBlock title="Backfill or dashboard query" code={fetchResponses} />
            </Card>
          </section>

          <section id="endpoints">
            <Card padded={false} className="overflow-hidden">
              <div className="border-b border-gray-200 p-5 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Endpoint reference</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Base URL: <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-slate-800">{env.apiUrl}</code></p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] divide-y divide-gray-200 text-left text-sm dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-900/70">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-gray-700 dark:text-slate-200">Method</th>
                      <th className="px-5 py-3 font-semibold text-gray-700 dark:text-slate-200">Path</th>
                      <th className="px-5 py-3 font-semibold text-gray-700 dark:text-slate-200">Auth</th>
                      <th className="px-5 py-3 font-semibold text-gray-700 dark:text-slate-200">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {endpoints.map((endpoint) => (
                      <tr key={`${endpoint.method}-${endpoint.path}`}>
                        <td className="whitespace-nowrap px-5 py-4"><MethodBadge method={endpoint.method} /></td>
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-gray-900 dark:text-slate-100">{endpoint.path}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-900 dark:text-slate-100">{endpoint.auth}</span>
                            {endpoint.scope && <span className="font-mono text-xs text-gray-500 dark:text-slate-400">{endpoint.scope}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-slate-300">{endpoint.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          <section id="edge-cases" className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Production edge cases</h2>
              <div className="mt-4 grid gap-3">
                {[
                  'Use Idempotency-Key for response intake requests to prevent duplicate saves.',
                  'Treat webhook delivery as at-least-once. Upsert by response id in your DB.',
                  'Verify X-FormNest-Signature on the raw request body before parsing.',
                  'Return 2xx only after your DB write or queue enqueue succeeds.',
                  'Handle validation errors per field and show user-safe messages.',
                  'Expect rate limits on intake and authenticated API calls.',
                  'Keep API keys server-side. Browser clients should use no-key intake and form-definition endpoints only.',
                  'Use response API for replay/backfill when webhook deliveries fail.',
                ].map((item) => (
                  <div key={item} className="flex gap-2 text-sm leading-6 text-gray-600 dark:text-slate-300">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-green-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recommended build order</h2>
              <div className="mt-4 space-y-3">
                {[
                  ['1', 'Create and publish the form in FormNest.'],
                  ['2', 'Choose public link, responsive embed, or headless submit.'],
                  ['3', 'Configure a webhook if your product DB needs every response.'],
                  ['4', 'Store webhook payloads idempotently and monitor delivery logs.'],
                  ['5', 'Use the response API for backfill, exports, or internal tooling.'],
                ].map(([step, label]) => (
                  <div key={step} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{step}</span>
                    <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/developer/webhooks">
                  <Button variant="outline" leftIcon={<Webhook className="h-4 w-4" />} rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Webhooks
                  </Button>
                </Link>
                <Link to="/developer/api-keys">
                  <Button variant="outline" leftIcon={<KeyRound className="h-4 w-4" />} rightIcon={<ArrowRight className="h-4 w-4" />}>
                    API keys
                  </Button>
                </Link>
              </div>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
