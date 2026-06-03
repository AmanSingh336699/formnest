import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, XCircle, Key, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/services/admin.service';
import type { AdminApiKeyRow } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import toast from 'react-hot-toast';

export default function ApiKeysList(): JSX.Element {
  const [keys, setKeys] = useState<AdminApiKeyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Revoke state
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<AdminApiKeyRow | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const prevParamsRef = useRef<string>('');

  async function fetchKeys() {
    setLoading(true);
    try {
      const params: { page: number; limit: number; search?: string } = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();

      const paramString = JSON.stringify(params);
      prevParamsRef.current = paramString;

      const data = await adminApi.listApiKeys(params);
      
      if (prevParamsRef.current === paramString) {
        setKeys(data.items);
        setTotal(data.total);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKeys();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchKeys();
  }

  function handleClearFilters() {
    setSearch('');
    setPage(1);
  }

  function openRevokeModal(key: AdminApiKeyRow) {
    setSelectedKey(key);
    setReason('');
    setRevokeOpen(true);
  }

  async function handleRevokeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKey) return;
    if (!reason.trim()) {
      toast.error('A reason is required to revoke an API key');
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.revokeApiKey(selectedKey.id, reason);
      toast.success('API Key revoked successfully');
      setRevokeOpen(false);
      fetchKeys();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to revoke key');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">API Keys Directory</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total of {total} API keys issued for system integration
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by key name, prefix, owner email..."
              className="pl-9 h-10 w-full"
            />
          </div>
          {search && (
            <Button type="button" variant="ghost" onClick={handleClearFilters} className="h-10">
              Clear
            </Button>
          )}
          <Button type="submit" className="h-10">
            Search
          </Button>
        </form>
      </Card>

      {/* Main Table */}
      <Card padded={false} className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-6 w-1/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-6 w-1/12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-6 w-1/6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <XCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-semibold">No API keys found</h3>
            <p className="text-sm text-slate-400 mt-1">Try tweaking your search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 font-medium">
                  <th className="px-6 py-3">Key Name</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Last Used</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {keys.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg">
                          <Key className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</span>
                          <span className="text-xs text-slate-500 font-mono">{row.keyPrefix}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link
                          to={`/admin/users/${row.userId}`}
                          className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {row.userName || 'Unnamed User'}
                        </Link>
                        <span className="text-xs text-slate-500">{row.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      {row.revokedAt ? (
                        <Badge variant="danger">Revoked</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!row.revokedAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => openRevokeModal(row)}
                          className="text-red-650 hover:text-red-700"
                        >
                          Revoke Key
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && keys.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-semibold">{total}</span> API keys
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 px-2">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Revoke Modal */}
      <Modal
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke API Key"
        description="This key will be permanently deactivated. Any active applications using it will lose API access."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRevokeOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={actionLoading} onClick={handleRevokeSubmit}>
              Revoke Key
            </Button>
          </>
        }
      >
        <form onSubmit={handleRevokeSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Reason for Revoking</label>
            <Textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this API key being revoked?"
              rows={3}
              className="w-full"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
