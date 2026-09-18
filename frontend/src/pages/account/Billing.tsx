import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { billingApi } from '../../api/services/billing.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const PLANS = [
  {
    key: 'FREE' as const,
    name: 'Free',
    price: 0,
    features: ['Up to 5 forms'],
  },
  {
    key: 'PRO' as const,
    name: 'Pro',
    price: 12,
    features: ['Up to 50 forms'],
  },
  {
    key: 'ENTERPRISE' as const,
    name: 'Enterprise',
    price: 49,
    features: ['Up to 1,000 forms'],
  },
];

export function BillingPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);

  const checkoutMut = useMutation({
    mutationFn: ({ plan, interval }: { plan: 'PRO' | 'ENTERPRISE'; interval: 'monthly' | 'yearly' }) =>
      billingApi.checkout(plan, interval),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Checkout failed'),
  });

  const portalMut = useMutation({
    mutationFn: () => billingApi.portal(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Open portal failed'),
  });

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-slate-100">Billing & Plans</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = user?.plan === p.key;
          return (
            <Card key={p.key} className="flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{p.name}</h2>
                {isCurrent && <Badge variant="success">Current</Badge>}
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-slate-100">${p.price}</span>
                {p.price > 0 && <span className="text-sm text-gray-500 dark:text-slate-400">/mo</span>}
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-700 dark:text-slate-300">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {!isCurrent && p.key !== 'FREE' && (
                <Button
                  className="mt-6"
                  onClick={() => checkoutMut.mutate({ plan: p.key, interval: 'monthly' })}
                  loading={checkoutMut.isPending}
                >
                  Upgrade to {p.name}
                </Button>
              )}
              {isCurrent && p.key !== 'FREE' && (
                <Button variant="outline" className="mt-6" onClick={() => portalMut.mutate()} loading={portalMut.isPending}>
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
