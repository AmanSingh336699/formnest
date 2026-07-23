import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Download, Trash2, ShieldAlert, Loader2,
  Inbox, Search, Calendar, Clock, Globe, CheckCircle,
  AlertTriangle, ChevronLeft, ChevronRight, X, User,
} from 'lucide-react';
import { formsApi } from '../../api/services/forms.service';
import { responsesApi } from '../../api/services/responses.service';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
function EmptyDetail() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center px-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 transition-colors duration-200">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-brand-100/50 dark:bg-brand-500/10 blur-xl animate-pulse"></div>
        <div className="relative rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
          <Inbox className="h-10 w-10 text-brand-500 dark:text-brand-400" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No response selected</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-[260px] leading-relaxed">
          Click any row on the left to inspect its details, answers, and metadata.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Metadata pill
───────────────────────────────────────────── */
function MetaPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm px-4 py-3 flex-1 min-w-0 transition-colors hover:border-brand-200 dark:hover:border-brand-500/30">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </span>
      <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200" title={value}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Answer card
───────────────────────────────────────────── */
function AnswerCard({ label, value, wide }: { label: string; value: string; wide: boolean }) {
  const empty = value === '—';
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-5 py-4 transition-all duration-200 hover:shadow-md hover:border-brand-200 dark:hover:border-brand-500/30 hover:-translate-y-0.5 ${wide ? 'col-span-2' : 'col-span-1'}`}
    >
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-400 to-brand-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-brand-500 dark:to-brand-400" />
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`whitespace-pre-wrap text-sm leading-relaxed font-medium ${empty ? 'text-gray-300 dark:text-gray-600 italic' : 'text-gray-800 dark:text-gray-200'}`}>
        {empty ? 'No answer' : value}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export function FormResponsesPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [includeSpam, setIncludeSpam] = useState(false);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const qc = useQueryClient();

  /* Queries */
  const { data: form } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsApi.get(id as string),
    enabled: !!id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['responses', id, { page, includeSpam }],
    queryFn: () => responsesApi.listForForm(id as string, { page, includeSpam, limit: 20 }),
    enabled: !!id,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['response', openId],
    queryFn: () => responsesApi.get(openId as string),
    enabled: !!openId,
  });

  /* Mutations */
  const deleteMut = useMutation({
    mutationFn: (rid: string) => responsesApi.remove(rid),
    onSuccess: () => {
      toast.success('Response deleted');
      qc.invalidateQueries({ queryKey: ['responses', id] });
      setDeleteId(null);
      setOpenId(null);
    },
  });

  const spamMut = useMutation({
    mutationFn: ({ rid, isSpam }: { rid: string; isSpam: boolean }) => responsesApi.markSpam(rid, isSpam),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responses', id] });
      qc.invalidateQueries({ queryKey: ['response', openId] });
      toast.success(detail?.isSpam ? 'Marked as safe' : 'Marked as spam');
    },
  });

  async function handleExport() {
    try {
      await responsesApi.downloadCsv(id as string, includeSpam);
      toast.success('Export started');
    } catch {
      toast.error('Export failed');
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const fieldsById = new Map((form?.fields ?? []).map((f) => [f.id, f]));

  const filtered = (data?.items ?? []).filter((r) =>
    search ? r.id.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    /* Full viewport height, no outer scroll */
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-200">

      {/* ── Top Bar ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-3.5 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <Link
            to={`/dashboard/forms/${id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              {form?.title ?? <Skeleton className="h-4 w-40" />}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {data?.total ?? 0} response{data?.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          leftIcon={<Download className="h-3.5 w-3.5" />}
          className="text-xs"
        >
          Export CSV
        </Button>
      </header>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Response list */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 xl:w-96 transition-colors duration-200">

          {/* List toolbar */}
          <div className="flex shrink-0 flex-col gap-3 border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
              <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <input
                className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                placeholder="Search response ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Switch checked={includeSpam} onChange={setIncludeSpam} label="Include spam" />
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="space-y-px p-2">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
                <Inbox className="h-7 w-7 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No responses</p>
                <p className="text-xs text-gray-400">
                  {search ? 'Try a different search term' : 'Once people submit your form, responses appear here.'}
                </p>
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <ul className="divide-y divide-gray-50 p-2 space-y-0.5">
                {filtered.map((r, idx) => {
                  const isActive = r.id === openId;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => setOpenId(r.id)}
                        className={`w-full rounded-lg px-3.5 py-3 text-left transition-all
                          ${isActive
                            ? 'bg-brand-50 border border-brand-200 shadow-sm dark:bg-brand-500/10 dark:border-brand-500/30'
                            : 'hover:bg-gray-50 border border-transparent dark:hover:bg-gray-800'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
                              ${isActive ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                              {(page - 1) * 20 + idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium truncate ${isActive ? 'text-brand-800 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                #{r.id.slice(-8).toUpperCase()}
                              </p>
                              {r.isSpam && (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                                  <AlertTriangle className="h-2.5 w-2.5" /> spam
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="shrink-0 text-[11px] text-gray-400 tabular-nums">
                            {fmtShort(r.createdAt)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Page {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </aside>

        {/* RIGHT: Detail panel */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {!openId && <EmptyDetail />}

          {openId && (
            <>
              {/* Detail toolbar */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-3 transition-colors duration-200">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20">
                    <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {detail ? `#${detail.id.slice(-8).toUpperCase()}` : <Skeleton className="h-3.5 w-28" />}
                    </p>
                    {detail?.createdAt && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(detail.createdAt)}</p>
                    )}
                  </div>
                </div>

                {detail && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => spamMut.mutate({ rid: detail.id, isSpam: !detail.isSpam })}
                      disabled={spamMut.isPending}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all
                        ${detail.isSpam
                          ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                          : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                        }`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {detail.isSpam ? 'Mark safe' : 'Mark spam'}
                    </button>
                    <button
                      onClick={() => setDeleteId(detail.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-all hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Detail body — the ONLY scrollable region */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {detailLoading && (
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                  </div>
                )}

                {detail && (
                  <div className="space-y-6 pb-8">

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-2">
                      <MetaPill
                        icon={Calendar}
                        label="Submitted"
                        value={fmtDate(detail.createdAt)}
                      />
                      <MetaPill
                        icon={Clock}
                        label="Time taken"
                        value={detail.completionTimeMs ? `${Math.round(detail.completionTimeMs / 1000)}s` : '—'}
                      />
                      <MetaPill
                        icon={Globe}
                        label="Referrer"
                        value={
                          detail.referrer
                            ? (() => { try { return new URL(detail.referrer).hostname; } catch { return detail.referrer; } })()
                            : 'Direct'
                        }
                      />
                      <div className="flex flex-col gap-1 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 px-4 py-3 flex-1 min-w-0 shadow-sm transition-colors hover:border-brand-200 dark:hover:border-brand-500/30">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          {detail.isSpam
                            ? <AlertTriangle className="h-3 w-3 text-red-400" />
                            : <CheckCircle className="h-3 w-3 text-green-500" />
                          }
                          Status
                        </span>
                        {detail.isSpam ? (
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            Spam {detail.spamReason ? `· ${detail.spamReason}` : '· Auto-detected'}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-green-700 dark:text-green-400">Verified safe</span>
                        )}
                      </div>
                    </div>

                    {/* Section header */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Answers</p>
                        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                        <span className="text-xs text-gray-400 dark:text-gray-500">{detail.answers.length} field{detail.answers.length !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Answer grid — auto-fit, no forced scroll */}
                      <div className="grid grid-cols-2 gap-3">
                        {detail.answers.map((a) => {
                          const field = fieldsById.get(a.fieldId);
                          const valStr = formatValue(a.value);
                          const isLong =
                            field?.type === 'TEXT_LONG' ||
                            (typeof a.value === 'string' && a.value.length > 80);
                          return (
                            <AnswerCard
                              key={a.id}
                              label={field?.label ?? a.fieldId}
                              value={valStr}
                              wide={isLong}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete this response?"
        description="This action cannot be undone. The response will be permanently removed."
        destructive
        confirmLabel="Delete response"
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); }}
      />
    </div>
  );
}
