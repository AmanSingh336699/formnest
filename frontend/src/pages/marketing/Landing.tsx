import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ArrowRight, Zap, Code, Webhook, BarChart2 } from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'Drag-Drop Builder', desc: '13 field types, instant preview, auto-save. Build a form in under 5 minutes.' },
  { icon: Code, title: 'Powerful API', desc: 'OpenAPI 3.1 spec, cursor pagination, idempotency keys. Built for developers.' },
  { icon: Webhook, title: 'HMAC Webhooks', desc: 'Stripe-style signatures, retries with jitter, replay logs.' },
  { icon: BarChart2, title: 'Analytics', desc: 'Views, starts, completion rates — privacy-first, no third-party trackers.' },
];

const FAQ = [
  { q: 'Is there a free plan?', a: 'Yes! 5 forms, 100 responses/month, no credit card required. Free forever.' },
  { q: 'Can I embed forms on my site?', a: 'Yes — iframe embed with automatic resizing. One snippet, drop it anywhere.' },
  { q: 'How are responses delivered?', a: 'View in your dashboard, export CSV, or pipe to your stack via webhooks and REST API.' },
  { q: 'Is my data secure?', a: 'GDPR-compliant. IPs anonymized at write. Bcrypt password hashing. HMAC-signed webhooks.' },
];

export function LandingPage(): JSX.Element {
  return (
    <div>
      <section className="bg-gradient-to-b from-white to-brand-50 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Build forms in minutes.<br />
            <span className="text-brand-600">Collect responses forever.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            FormNest combines Typeform's elegance, Google Forms' simplicity, and Formspree's developer-friendliness. Drag-drop builder, REST API, HMAC webhooks — all in one platform.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>Start Free — No Credit Card</Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline">See pricing</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">Everything you need to collect responses</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                  <f.icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">Frequently asked questions</h2>
          <div className="mt-12 space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="rounded-lg border border-gray-200 bg-white px-5 py-4">
                <summary className="cursor-pointer text-base font-medium text-gray-900">{f.q}</summary>
                <p className="mt-2 text-sm text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-600 px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">Ready to build your first form?</h2>
          <p className="mt-3 text-brand-100">Free forever. No credit card. Setup in 30 seconds.</p>
          <Link to="/register" className="mt-6 inline-block">
            <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>Get started free</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
