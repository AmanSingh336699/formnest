import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Webhook as WebhookIcon, Plus, Send, Trash2, Copy, AlertTriangle } from 'lucide-react';
import { formsApi } from '../../api/services/forms.service';
import { webhooksApi, type CreatedWebhook } from '../../api/services/webhooks.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import toast from 'react-hot-toast';

export function WebhooksPage(): JSX.Element {
  const qc = useQueryClient();
  const [selectedFormId, setSelectedFormId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedWebhook | null>(null);
  const { copy } = useCopyToClipboard();

  const { data: forms } = useQuery({ queryKey: ['forms', 'all'], queryFn: () => formsApi.list({ limit: 100 }) });

  // Default to first form when forms load
  if (forms && forms.items.length > 0 && !selectedFormId) {
    setSelectedFormId(forms.items[0]!.id);
  }

  const { data: hooks, isLoading } = useQuery({
    queryKey: ['webhooks', selectedFormId],
    queryFn: () => webhooksApi.list(selectedFormId),
    enabled: !!selectedFormId,
  });

  const createMut = useMutation({
    mutationFn: () => webhooksApi.create(selectedFormId, newUrl, ['response.created']),
    onSuccess: (wh) => {
      qc.invalidateQueries({ queryKey: ['webhooks', selectedFormId] });
      setCreated(wh);
      setCreating(false);
      setNewUrl('');
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Create failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => webhooksApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks', selectedFormId] });
      toast.success('Webhook deleted');
      setDeleteId(null);
    },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => webhooksApi.test(id),
    onSuccess: () => toast.success('Test event queued'),
  });

  if (!forms || forms.items.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <EmptyState icon={WebhookIcon} title="No forms yet" description="Create a form first to add webhooks." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Webhooks</h1>
          <p className="mt-1 text-sm text-gray-500">Get notified when responses arrive — delivered with HMAC signatures.</p>
        </div>
        <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>New webhook</Button>
      </div>

      <Card className="mb-4">
        <Select
          label="Form"
          value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
          options={forms.items.map((f) => ({ value: f.id, label: f.title }))}
        />
      </Card>

      {isLoading && <Skeleton className="h-32" />}
      {!isLoading && (hooks ?? []).length === 0 && (
        <EmptyState icon={WebhookIcon} title="No webhooks for this form" description="Add a webhook URL above to start receiving events." />
      )}
      {!isLoading && (hooks ?? []).length > 0 && (
        <Card padded={false}>
          <div className="divide-y divide-gray-100">
            {(hooks ?? []).map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="truncate font-mono text-sm text-gray-900">{w.url}</code>
                    {w.isActive ? <Badge variant="success">active</Badge> : <Badge variant="neutral">disabled</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Events: {w.events.join(', ')} · Failures: {w.failureCount}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" leftIcon={<Send className="h-3.5 w-3.5" />} onClick={() => testMut.mutate(w.id)}>
                    Test
                  </Button>
                  <button onClick={() => setDeleteId(w.id)} className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Add webhook"
        description="We'll POST events to this URL. Use HTTPS only."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button loading={createMut.isPending} onClick={() => newUrl && createMut.mutate()}>Add</Button>
          </>
        }
      >
        <Input label="Endpoint URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://example.com/webhooks/formnest" />
      </Modal>

      <Modal
        open={!!created}
        onOpenChange={(o) => { if (!o) setCreated(null); }}
        title="Webhook secret"
        size="lg"
        footer={<Button onClick={() => setCreated(null)}>Done</Button>}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Copy this signing secret now — used to verify webhook signatures.</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <code className="flex-1 font-mono text-xs text-gray-900 break-all">{created?.secret}</code>
            <Button size="sm" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => created && copy(created.secret)}>
              Copy
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete this webhook?"
        description="No more events will be sent to this URL."
        destructive
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); }}
      />
    </div>
  );
}
