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
    <div className="bg-white px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
          <p className="mt-3 text-lg text-gray-600">Start free. Upgrade when you outgrow it.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                'rounded-2xl border p-8 ' +
                (p.highlighted ? 'border-brand-600 bg-brand-50 shadow-lg' : 'border-gray-200 bg-white')
              }
            >
              <h2 className="text-xl font-semibold text-gray-900">{p.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{p.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">${p.price}</span>
                {p.price > 0 && <span className="text-gray-500">/mo</span>}
              </div>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
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
