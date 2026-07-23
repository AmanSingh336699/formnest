import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, MousePointerClick, CheckCircle2, TrendingUp } from 'lucide-react';
import { analyticsApi } from '../../api/services/analytics.service';
import { formsApi } from '../../api/services/forms.service';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';

export function FormAnalyticsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: form } = useQuery({ queryKey: ['form', id], queryFn: () => formsApi.get(id as string), enabled: !!id });
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', id],
    queryFn: () => analyticsApi.forForm(id as string, 7),
    enabled: !!id,
  });

  const max = Math.max(1, ...(data?.daily ?? []).map((d) => Math.max(d.views, d.completions)));

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to={`/dashboard/forms/${id}`} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{form?.title ?? 'Analytics'}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Views" value={data?.totalViews ?? 0} icon={Eye} loading={isLoading} />
        <Stat label="Starts" value={data?.totalStarts ?? 0} icon={MousePointerClick} loading={isLoading} />
        <Stat label="Responses" value={data?.totalResponses ?? 0} icon={CheckCircle2} loading={isLoading} />
        <Stat label="Completion rate" value={`${data?.completionRate ?? 0}%`} icon={TrendingUp} loading={isLoading} />
      </div>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Daily activity</h2>
        {isLoading && <Skeleton className="mt-4 h-48 w-full" />}
        {!isLoading && (
          <div className="mt-6 flex h-48 items-end gap-2">
            {(data?.daily ?? []).map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end gap-0.5">
                  <div
                    className="flex-1 rounded-t bg-brand-200"
                    style={{ height: `${(d.views / max) * 100}%` }}
                    title={`${d.views} views`}
                  />
                  <div
                    className="flex-1 rounded-t bg-brand-600"
                    style={{ height: `${(d.completions / max) * 100}%` }}
                    title={`${d.completions} completions`}
                  />
                </div>
                <div className="text-[10px] text-gray-500">{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-200" /> Views</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-600" /> Completions</span>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon, loading }: { label: string; value: string | number; icon: typeof Eye; loading: boolean }): JSX.Element {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-50 p-2"><Icon className="h-5 w-5 text-brand-600" /></div>
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
          {loading ? <Skeleton className="mt-1 h-6 w-16" /> : <div className="text-2xl font-semibold text-gray-900">{value}</div>}
        </div>
      </div>
    </Card>
  );
}
