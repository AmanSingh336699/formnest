import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, CheckCircle2, XCircle, ChevronLeft, ChevronRight, SlidersHorizontal, Eye } from 'lucide-react';
import { adminApi, type AdminUserListParams } from '../../api/services/admin.service';
import type { AdminUserRow, UserPlan } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import toast from 'react-hot-toast';

export default function UsersList(): JSX.Element {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<UserPlan | 'ALL'>('ALL');
  const [verified, setVerified] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [suspended, setSuspended] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Ref to hold previous search term to avoid redundant calls
  const prevParamsRef = useRef<string>('');

  async function fetchUsers() {
    setLoading(true);
    try {
      const params: AdminUserListParams = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (plan !== 'ALL') params.plan = plan;
      if (verified !== 'ALL') params.verified = verified === 'true';
      if (suspended !== 'ALL') params.suspended = suspended === 'true';

      const paramString = JSON.stringify(params);
      prevParamsRef.current = paramString;

      const data = await adminApi.listUsers(params);
      
      // Prevent state update if params changed during request
      if (prevParamsRef.current === paramString) {
        setUsers(data.items);
        setTotal(data.total);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  // Reload when page or filters change
  useEffect(() => {
    fetchUsers();
  }, [page, plan, verified, suspended]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  }

  function handleClearFilters() {
    setSearch('');
    setPlan('ALL');
    setVerified('ALL');
    setSuspended('ALL');
    setPage(1);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Users Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total of {total} registered user accounts
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Search Users</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email..."
                  className="pl-9 h-10 w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Subscription Plan</label>
              <Select
                value={plan}
                onChange={(e) => { setPlan(e.target.value as any); setPage(1); }}
                className="h-10 w-full"
                options={[
                  { value: 'ALL', label: 'All Plans' },
                  { value: 'FREE', label: 'Free' },
                  { value: 'PRO', label: 'Pro' },
                  { value: 'ENTERPRISE', label: 'Enterprise' },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Verification</label>
              <Select
                value={verified}
                onChange={(e) => { setVerified(e.target.value as any); setPage(1); }}
                className="h-10 w-full"
                options={[
                  { value: 'ALL', label: 'All States' },
                  { value: 'true', label: 'Verified' },
                  { value: 'false', label: 'Unverified' },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Account Status</label>
              <Select
                value={suspended}
                onChange={(e) => { setSuspended(e.target.value as any); setPage(1); }}
                className="h-10 w-full"
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'false', label: 'Active' },
                  { value: 'true', label: 'Suspended' },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters}>
              Reset Filters
            </Button>
            <Button type="submit" size="sm" leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
              Filter
            </Button>
          </div>
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
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <XCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-semibold">No users found</h3>
            <p className="text-sm text-slate-400 mt-1">Try tweaking your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 font-medium">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Verification</th>
                  <th className="px-6 py-3">Subscription</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {users.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/admin/users/${row.id}`)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                          {row.name}
                          {row.isSuspended && (
                            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-normal">
                              <ShieldAlert className="h-3 w-3" />
                              Suspended
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">{row.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {row.emailVerified ? (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Unverified</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            row.plan === 'FREE' ? 'neutral' : row.plan === 'PRO' ? 'default' : 'success'
                          }
                        >
                          {row.plan}
                        </Badge>
                        {row.planValidUntil && (
                          <span className="text-[10px] text-slate-400">
                            Until {new Date(row.planValidUntil).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(row.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {row.isAdmin ? (
                        <Badge variant="danger">ADMIN</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/admin/users/${row.id}`} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-medium">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Manage</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-semibold">{total}</span> users
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
    </div>
  );
}
