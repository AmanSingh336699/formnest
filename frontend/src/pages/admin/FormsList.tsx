import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, XCircle, FileText, ExternalLink } from 'lucide-react';
import { adminApi } from '../../api/services/admin.service';
import type { AdminFormRow } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

export default function FormsList(): JSX.Element {
  const [forms, setForms] = useState<AdminFormRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const prevParamsRef = useRef<string>('');

  async function fetchForms() {
    setLoading(true);
    try {
      const params: { page: number; limit: number; search?: string } = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();

      const paramString = JSON.stringify(params);
      prevParamsRef.current = paramString;

      const data = await adminApi.listForms(params);
      
      if (prevParamsRef.current === paramString) {
        setForms(data.items);
        setTotal(data.total);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchForms();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchForms();
  }

  function handleClearFilters() {
    setSearch('');
    setPage(1);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Forms Directory</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total of {total} forms built by users
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
              placeholder="Search by form title, owner email..."
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
                <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-6 w-1/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-6 w-1/12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-6 w-1/6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <XCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-semibold">No forms found</h3>
            <p className="text-sm text-slate-400 mt-1">Try tweaking your search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 font-medium">
                  <th className="px-6 py-3">Form</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {forms.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.title}</span>
                          <span className="text-xs text-slate-500">/{row.slug}</span>
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
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          row.status === 'PUBLISHED'
                            ? 'success'
                            : row.status === 'CLOSED'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(row.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/f/${row.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 font-semibold"
                      >
                        <span>View Form</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && forms.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-semibold">{total}</span> forms
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
