import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'For personal projects',
    features: ['5 forms', '100 responses/month', '1 webhook per form', '1 API key', 'CSV export', 'Community support'],
    cta: 'Start free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 12,
    description: 'For growing teams',
    features: ['Unlimited forms', '10,000 responses/month', '5 webhooks per form', '5 API keys', 'Remove branding', 'Custom slugs', 'Priority support'],
    cta: 'Start Pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 49,
    description: 'For serious operations',
    features: ['Unlimited everything', 'Team (10 seats)', 'Dedicated support', '99.9% SLA', 'Annual DPA', 'White-label'],
    cta: 'Contact sales',
    highlighted: false,
  },
];

export function PricingPage(): JSX.Element {
  return (
    <div className="bg-white px-6 py-14 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Simple, transparent pricing</h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-slate-300">Start free. Upgrade when you outgrow it.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                'flex flex-col rounded-lg border p-7 transition-colors ' +
                (p.highlighted
                  ? 'border-brand-600 bg-brand-50 shadow-lg dark:border-brand-400 dark:bg-brand-500/15'
                  : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900')
              }
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{p.name}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{p.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">${p.price}</span>
                {p.price > 0 && <span className="text-gray-500 dark:text-slate-400">/mo</span>}
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-700 dark:text-slate-300">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="mt-8 block">
                <Button fullWidth variant={p.highlighted ? 'primary' : 'outline'}>{p.cta}</Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
