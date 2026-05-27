import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { formsApi } from '../../api/services/forms.service';
import { useAuthStore } from '../../store/authStore';
import { FileText, Send, Eye, Plus } from 'lucide-react';

export function OverviewPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['forms', { page: 1, limit: 100 }],
    queryFn: () => formsApi.list({ page: 1, limit: 100 }),
  });

  const totalForms = data?.items.length ?? 0;
  const totalResponses = (data?.items ?? []).reduce((acc, f) => acc + f.totalResponses, 0);
  const totalViews = (data?.items ?? []).reduce((acc, f) => acc + f.totalViews, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here's what's happening with your forms.</p>
        </div>
        <Link to="/dashboard/forms">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Create form</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Forms" value={totalForms} icon={FileText} loading={isLoading} />
        <StatCard label="Total responses" value={totalResponses} icon={Send} loading={isLoading} />
        <StatCard label="Total views" value={totalViews} icon={Eye} loading={isLoading} />
      </div>

      <Card className="mt-8">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">Recent forms</h2>
        <div className="mt-4 space-y-2">
          {isLoading && (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          )}
          {!isLoading && (data?.items ?? []).slice(0, 5).map((f) => (
            <Link key={f.id} to={`/dashboard/forms/${f.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{f.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{f.totalResponses} responses</div>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(f.updatedAt).toLocaleDateString()}</span>
            </Link>
          ))}
          {!isLoading && (data?.items ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No forms yet - create your first one!</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, loading }: { label: string; value: number; icon: typeof FileText; loading: boolean }): JSX.Element {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-50 p-2 dark:bg-brand-500/15"><Icon className="h-5 w-5 text-brand-600 dark:text-brand-300" /></div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
          {loading ? <Skeleton className="mt-1 h-6 w-16" /> : <div className="text-2xl font-semibold text-slate-950 dark:text-white">{value.toLocaleString()}</div>}
        </div>
      </div>
    </Card>
  );
}
