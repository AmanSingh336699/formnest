import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, FileText } from 'lucide-react';
import { formsApi } from '../../api/services/forms.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';
import type { FormStatus, FormSummary } from '../../types';

function statusVariant(status: FormStatus): 'default' | 'success' | 'warning' | 'neutral' {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'DRAFT') return 'warning';
  if (status === 'CLOSED') return 'neutral';
  return 'neutral';
}

export function FormsListPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 400);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['forms', { search: debouncedSearch }],
    queryFn: () => formsApi.list({ search: debouncedSearch || undefined, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: () => formsApi.create({ title: 'Untitled form' }),
    onSuccess: (form) => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      navigate(`/dashboard/forms/${form.id}`);
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Failed to create form'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => formsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Form deleted');
      setDeleteId(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => formsApi.duplicate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Form duplicated');
    },
  });

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Forms</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create, edit, and manage your forms.</p>
        </div>
        <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} leftIcon={<Plus className="h-4 w-4" />}>
          New form
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input placeholder="Search forms..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      )}

      {!isLoading && (data?.items ?? []).length === 0 && (
        <EmptyState
          icon={FileText}
          title="No forms yet"
          description="Create your first form and start collecting responses in minutes."
          action={<Button onClick={() => createMutation.mutate()} leftIcon={<Plus className="h-4 w-4" />}>Create form</Button>}
        />
      )}

      {!isLoading && (data?.items ?? []).length > 0 && (
        <div className="space-y-3">
          {(data?.items ?? []).map((f: FormSummary) => (
            <Card key={f.id} padded={false} className="p-5 transition-all hover:border-brand-200 hover:shadow-md dark:hover:border-brand-500/30 dark:hover:shadow-none">
              <div className="flex items-center justify-between gap-4">
                <Link to={`/dashboard/forms/${f.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-medium text-slate-900 dark:text-slate-100">{f.title}</h3>
                    <Badge variant={statusVariant(f.status)}>{f.status.toLowerCase()}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{f.totalResponses} responses</span>
                    <span>·</span>
                    <span>{f.totalViews} views</span>
                    <span>·</span>
                    <span>Updated {new Date(f.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Link to={`/dashboard/forms/${f.id}/responses`}>
                    <Button variant="ghost" size="sm">Responses</Button>
                  </Link>
                  <button
                    onClick={() => duplicateMutation.mutate(f.id)}
                    className="rounded-md px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => setDeleteId(f.id)}
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    aria-label="Delete form"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete form?"
        description="All responses and webhooks will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete form"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
      />
    </div>
  );
}
