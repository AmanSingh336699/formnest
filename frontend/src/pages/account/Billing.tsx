import { Check, Clock, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const PLANS = [
  {
    key: 'FREE' as const,
    name: 'Free',
    price: 0,
    features: [
      'Up to 5 forms',
      'Unlimited form responses',
      'Instant email notifications',
      'Standard field validation',
    ],
    isAvailable: true,
  },
  {
    key: 'PRO' as const,
    name: 'Pro',
    price: 12,
    features: [
      'Up to 50 forms',
      'Custom URLs & slugs',
      'File uploads up to 50MB',
      'Priority webhook delivery',
    ],
    isAvailable: false,
  },
  {
    key: 'ENTERPRISE' as const,
    name: 'Enterprise',
    price: 49,
    features: [
      'Up to 1,000 forms',
      'Custom branding & domain',
      'Dedicated support & SLA',
      'Advanced audit logs',
    ],
    isAvailable: false,
  },
];

export function BillingPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);

  function handleUpgrade(planName: string): void {
    toast(`Online checkout for ${planName} is currently under process. Stay tuned for the upcoming release!`, {
      icon: '⏳',
      duration: 4000,
    });
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Billing & Plans</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Manage your subscription and usage limits.
        </p>
      </div>

      {/* Under Process Notice Banner */}
      <div className="mb-8 flex items-start gap-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:border-amber-500/20 dark:text-amber-200">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-sm">
          <p className="font-semibold text-amber-950 dark:text-amber-100">
            Payment & Subscription Gateway Under Process
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
            Automated online card payments for Pro and Enterprise plans are currently being integrated. In the meantime, your account is fully enabled on the <strong>Free tier</strong> with complete access to build and share forms.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = user?.plan === p.key;
          return (
            <Card key={p.key} className="flex flex-col border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{p.name}</h2>
                {isCurrent ? (
                  <Badge variant="success">Current Plan</Badge>
                ) : !p.isAvailable ? (
                  <Badge variant="warning">Under Process</Badge>
                ) : null}
              </div>

              <div className="mt-3">
                <span className="text-3xl font-bold text-gray-900 dark:text-slate-100">${p.price}</span>
                {p.price > 0 && <span className="text-sm text-gray-500 dark:text-slate-400">/mo</span>}
              </div>

              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-gray-700 dark:text-slate-300">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {!isCurrent && p.key !== 'FREE' && (
                <Button
                  className="mt-6 w-full"
                  variant="outline"
                  onClick={() => handleUpgrade(p.name)}
                >
                  <CreditCard className="mr-2 h-4 w-4 text-amber-500" />
                  Upgrade to {p.name} (Coming Soon)
                </Button>
              )}

              {isCurrent && p.key !== 'FREE' && (
                <Button
                  variant="outline"
                  className="mt-6 w-full"
                  onClick={() => handleUpgrade(p.name)}
                >
                  Manage subscription
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
