import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, Plus, Copy, Trash2, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { apiKeysApi, type CreatedApiKey } from '../../api/services/apiKeys.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import toast from 'react-hot-toast';

export function ApiKeysPage(): JSX.Element {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [revealedKey, setRevealedKey] = useState<{ id: string; rawKey: string } | null>(null);
  const { copy } = useCopyToClipboard();

  const { data, isLoading } = useQuery({ queryKey: ['api-keys'], queryFn: () => apiKeysApi.list() });

  const createMut = useMutation({
    mutationFn: (n: string) => apiKeysApi.create(n),
    onSuccess: (key) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setCreated(key);
      setCreating(false);
      setName('');
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Create failed'),
  });

  const revealMut = useMutation({
    mutationFn: (id: string) => apiKeysApi.reveal(id),
    onSuccess: (rawKey, id) => setRevealedKey({ id, rawKey }),
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Could not reveal key'),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Key revoked');
      setRevokeId(null);
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
          <p className="mt-1 text-sm text-gray-500">Use these keys to authenticate API requests from your servers.</p>
        </div>
        <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>New key</Button>
      </div>

      {isLoading && <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>}

      {!isLoading && (data ?? []).length === 0 && (
        <EmptyState
          icon={Key}
          title="No API keys yet"
          description="Create your first key to start using the FormNest API."
          action={<Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>Create key</Button>}
        />
      )}

      {!isLoading && (data ?? []).length > 0 && (
        <Card padded={false}>
          <div className="divide-y divide-gray-100">
            {(data ?? []).map((k) => (
              <div key={k.id} className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{k.name}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <code className="font-mono text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                      {revealedKey?.id === k.id ? revealedKey.rawKey : `${k.keyPrefix}••••••••••••`}
                    </code>
                    {revealedKey?.id === k.id && (
                      <button
                        onClick={() => copy(revealedKey.rawKey)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (revealedKey?.id === k.id) setRevealedKey(null);
                      else revealMut.mutate(k.id);
                    }}
                    disabled={revealMut.isPending && revealMut.variables === k.id}
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50"
                    aria-label="Reveal key"
                    title={revealedKey?.id === k.id ? 'Hide key' : 'Reveal key'}
                  >
                    {revealMut.isPending && revealMut.variables === k.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : revealedKey?.id === k.id ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button onClick={() => setRevokeId(k.id)} className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Revoke">
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
        title="Create API key"
        description="Choose a descriptive name to identify this key later."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button loading={createMut.isPending} onClick={() => name && createMut.mutate(name)}>Create</Button>
          </>
        }
      >
        <Input label="Key name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production backend" />
      </Modal>

      <Modal
        open={!!created}
        onOpenChange={(o) => { if (!o) setCreated(null); }}
        title="Your new API key"
        size="lg"
        footer={<Button onClick={() => setCreated(null)}>Done</Button>}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Save this key now — you won't be able to see it again.</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <code className="flex-1 font-mono text-sm text-gray-900 break-all">{created?.rawKey}</code>
            <Button size="sm" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => created && copy(created.rawKey)}>
              Copy
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!revokeId}
        onOpenChange={(o) => { if (!o) setRevokeId(null); }}
        title="Revoke this API key?"
        description="Any application using this key will immediately stop working."
        destructive
        confirmLabel="Revoke"
        loading={revokeMut.isPending}
        onConfirm={() => { if (revokeId) revokeMut.mutate(revokeId); }}
      />
    </div>
  );
}
