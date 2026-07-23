import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, Plus, Copy, Trash2, AlertTriangle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
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

function maskedKey(prefix: string): string {
  return `${prefix}${'*'.repeat(12)}`;
}

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
      setRevealedKey(null);
    },
  });

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">API Keys</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use these keys to authenticate API requests from your servers.</p>
        </div>
        <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>New key</Button>
      </div>

      {isLoading && <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>}

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
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {(data ?? []).map((k) => {
              const isRevealed = revealedKey?.id === k.id;
              const isRevealing = revealMut.isPending && revealMut.variables === k.id;
              return (
                <div key={k.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-950 dark:text-slate-100">{k.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <code className="rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                        {isRevealed ? revealedKey.rawKey : maskedKey(k.keyPrefix)}
                      </code>
                      {isRevealed && (
                        <button
                          type="button"
                          onClick={() => copy(revealedKey.rawKey)}
                          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Copy to clipboard"
                          aria-label="Copy API key"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!k.canReveal && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                          <Lock className="h-3 w-3" />
                          Legacy key
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt && ` - Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!k.canReveal) return;
                        if (isRevealed) setRevealedKey(null);
                        else revealMut.mutate(k.id);
                      }}
                      disabled={!k.canReveal || isRevealing}
                      className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      aria-label={isRevealed ? 'Hide key' : 'Reveal key'}
                      title={!k.canReveal ? 'This legacy key cannot be revealed. Create a new key.' : isRevealed ? 'Hide key' : 'Reveal key'}
                    >
                      {isRevealing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isRevealed ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevokeId(k.id)}
                      className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                      aria-label="Revoke"
                      title="Revoke key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
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
            <Button loading={createMut.isPending} onClick={() => name.trim() && createMut.mutate(name.trim())}>Create</Button>
          </>
        }
      >
        <Input label="Key name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production backend" />
      </Modal>

      <Modal
        open={!!created}
        onOpenChange={(o) => { if (!o) setCreated(null); }}
        title="Your new API key"
        description="Use it as a Bearer token from your backend or automation scripts."
        size="lg"
        footer={<Button onClick={() => setCreated(null)}>Done</Button>}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Store this key carefully. Anyone with it can access allowed API scopes.</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <code className="flex-1 break-all font-mono text-sm text-gray-900 dark:text-slate-100">{created?.rawKey}</code>
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
