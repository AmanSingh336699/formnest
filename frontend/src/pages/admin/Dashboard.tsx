import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, Key, Webhook, BarChart3, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../api/services/admin.service';
import type { AdminStats } from '../../types';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function Dashboard(): JSX.Element {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await adminApi.getStats();
        setStats(data);
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="h-64"><Skeleton className="h-full w-full" /></Card>
          <Card className="h-64"><Skeleton className="h-full w-full" /></Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-semibold">Stats Unavailable</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Could not retrieve administrative stats at this time.</p>
      </div>
    );
  }

  const planTotal = stats.plans.FREE + stats.plans.PRO + stats.plans.ENTERPRISE || 1;
  const freePercent = Math.round((stats.plans.FREE / planTotal) * 100);
  const proPercent = Math.round((stats.plans.PRO / planTotal) * 100);
  const enterprisePercent = Math.round((stats.plans.ENTERPRISE / planTotal) * 100);

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Real-time health status, counts, and signups.</p>
      </div>

      {/* Grid Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-indigo-400 dark:hover:border-indigo-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalUsers}</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs text-slate-500">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>{stats.verifiedUsers} verified</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>{stats.suspendedUsers} suspended</span>
          </div>
        </Card>

        <Card className="hover:border-rose-400 dark:hover:border-rose-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Forms</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalForms}</h3>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Across all user accounts</p>
        </Card>

        <Card className="hover:border-emerald-400 dark:hover:border-emerald-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">API Keys Issued</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalApiKeys}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Key className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Active developer integrations</p>
        </Card>

        <Card className="hover:border-amber-400 dark:hover:border-amber-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Failed Webhooks</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.failedWebhooks}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
              <Webhook className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Endpoints experiencing failures</p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Plan Distribution Chart */}
        <Card className="md:col-span-1 space-y-6">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              <span>Subscription Share</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">Breakdown of system users by tier</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">Free Tier</span>
                <span className="text-slate-500">{stats.plans.FREE} ({freePercent}%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full transition-all duration-500" style={{ width: `${freePercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-indigo-600 dark:text-indigo-400">Pro Plan</span>
                <span className="text-slate-500">{stats.plans.PRO} ({proPercent}%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${proPercent}%` }} style-color="indigo" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-rose-600 dark:text-rose-400">Enterprise</span>
                <span className="text-slate-500">{stats.plans.ENTERPRISE} ({enterprisePercent}%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${enterprisePercent}%` }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Signups */}
        <Card className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-500" />
                <span>Recent Signups (7d)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Latest user accounts added to the system</p>
            </div>
            <Link to="/admin/users" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            {stats.recentSignups.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">No new signups in the past 7 days.</div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5">Name</th>
                    <th className="py-2.5">Email</th>
                    <th className="py-2.5">Plan</th>
                    <th className="py-2.5">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {stats.recentSignups.map((signup) => (
                    <tr key={signup.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="py-3 font-medium">
                        <Link to={`/admin/users/${signup.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                          {signup.name}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">{signup.email}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            signup.plan === 'FREE' ? 'neutral' : signup.plan === 'PRO' ? 'default' : 'success'
                          }
                        >
                          {signup.plan}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-400 text-xs">
                        {new Date(signup.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
