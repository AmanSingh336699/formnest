import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ArrowRight, Zap, Code, BarChart2 } from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'Form Builder', desc: '14 field types including file uploads, instant preview, auto-save. Build a form in under 5 minutes.' },
  { icon: Code, title: 'Developer API', desc: 'REST API with API key authentication for direct form submissions and response retrieval.' },
  { icon: BarChart2, title: 'Analytics', desc: 'Views, starts, completion rates - privacy-first analytics for all your forms.' },
];

const FAQ = [
  { q: 'Is there a free plan?', a: 'Yes. Up to 5 forms, no credit card required. Free forever.' },
  { q: 'How are responses delivered?', a: 'View in your dashboard, export CSV, or retrieve via our REST API.' },
  { q: 'Is my data secure?', a: 'GDPR-compliant. Anonymized IPs. Secure Cloudinary storage for file uploads.' },
];

export function LandingPage(): JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-950">
      <section className="bg-gradient-to-b from-white to-brand-50 px-6 py-16 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl dark:text-white">
            Build forms in minutes.<br />
            <span className="text-brand-600 dark:text-brand-300">Collect responses forever.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-slate-300">
            FormNest combines polished form building, file upload support, developer APIs, and response analytics in one production-ready platform.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/register">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />} className="w-full sm:w-auto">Start Free - No Credit Card</Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">See pricing</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">Everything you need to collect responses</h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-gray-200 bg-white p-6 transition-colors hover:border-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/15">
                  <f.icon className="h-5 w-5 text-brand-600 dark:text-brand-300" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-6 py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">Frequently asked questions</h2>
          <div className="mt-10 space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="rounded-lg border border-gray-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-950">
                <summary className="cursor-pointer text-base font-medium text-gray-900 dark:text-slate-100">{f.q}</summary>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-600 px-6 py-14 text-white dark:bg-brand-700">
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
