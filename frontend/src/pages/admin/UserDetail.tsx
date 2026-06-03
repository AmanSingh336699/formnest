import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  CreditCard,
  AlertTriangle,
  Send,
  Ban,
  Unlock,
  Key,
  Webhook,
  FileText,
  Trash2,
} from 'lucide-react';
import { adminApi } from '../../api/services/admin.service';
import type { AdminUserDetail, UserPlan } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';

export default function UserDetail(): JSX.Element {
  const { userId } = useParams<{ userId: string }>();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'forms' | 'api-keys' | 'webhooks'>('forms');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    | 'verify-email'
    | 'unverify-email'
    | 'resend-verification'
    | 'change-plan'
    | 'suspend'
    | 'unsuspend'
    | 'revoke-sessions'
    | 'revoke-key'
    | 'disable-webhook'
    | null
  >(null);

  // Form states in modals
  const [reason, setReason] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<UserPlan>('FREE');
  const [planValidUntil, setPlanValidUntil] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchUserDetail() {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await adminApi.getUser(userId);
      setDetail(data);
      setSelectedPlan(data.user.plan);
      setPlanValidUntil(data.user.planValidUntil ? data.user.planValidUntil.slice(0, 10) : '');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  function openActionModal(
    type: typeof modalType,
    target: string | null = null
  ) {
    setModalType(type);
    setTargetId(target);
    setReason('');
    setModalOpen(true);
  }

  async function handleActionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!reason.trim() && modalType !== 'resend-verification') {
      toast.error('A reason is required to complete this action');
      return;
    }

    setActionLoading(true);
    try {
      switch (modalType) {
        case 'verify-email':
          await adminApi.verifyEmail(userId, reason);
          toast.success('Email verified successfully');
          break;
        case 'unverify-email':
          await adminApi.unverifyEmail(userId, reason);
          toast.success('Email unverified successfully');
          break;
        case 'resend-verification':
          await adminApi.resendVerification(userId);
          toast.success('Verification email sent');
          break;
        case 'change-plan':
          await adminApi.changePlan(userId, {
            plan: selectedPlan,
            planValidUntil: planValidUntil || null,
            reason,
          });
          toast.success('Subscription plan updated');
          break;
        case 'suspend':
          await adminApi.suspend(userId, reason);
          toast.success('User suspended and sessions revoked');
          break;
        case 'unsuspend':
          await adminApi.unsuspend(userId, reason);
          toast.success('User unsuspended');
          break;
        case 'revoke-sessions':
          await adminApi.revokeSessions(userId, reason);
          toast.success('All sessions revoked');
          break;
        case 'revoke-key':
          if (targetId) {
            await adminApi.revokeApiKey(targetId, reason);
            toast.success('API Key revoked');
          }
          break;
        case 'disable-webhook':
          if (targetId) {
            await adminApi.disableWebhook(targetId, reason);
            toast.success('Webhook disabled');
          }
          break;
      }
      setModalOpen(false);
      fetchUserDetail();
    } catch (err: any) {
      toast.error(err?.message ?? 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !detail) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="h-96 md:col-span-1"><Skeleton className="h-full w-full" /></Card>
          <Card className="h-96 md:col-span-2"><Skeleton className="h-full w-full" /></Card>
        </div>
      </div>
    );
  }

  if (!detail || !userId) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-semibold">User Not Found</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">The requested user account does not exist.</p>
        <Link to="/admin/users" className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          Back to Directory
        </Link>
      </div>
    );
  }

  const { user } = detail;

  return (
    <div className="p-6 space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/admin/users" className="hover:text-slate-850 dark:hover:text-slate-200">Users</Link>
        <span>/</span>
        <span className="font-semibold text-slate-800 dark:text-slate-350">{user.email}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Profile Info + Actions */}
        <div className="md:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card className="relative overflow-hidden">
            {user.isSuspended && (
              <div className="absolute top-0 right-0 bg-red-650 text-white text-[10px] font-bold tracking-wide uppercase px-3 py-1 rounded-bl">
                Suspended
              </div>
            )}
            <div className="flex flex-col items-center text-center space-y-3 pt-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold text-xl uppercase shadow-inner">
                {user.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold">{user.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 select-all">{user.email}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 pt-1.5">
                <Badge variant={user.plan === 'FREE' ? 'neutral' : user.plan === 'PRO' ? 'default' : 'success'}>
                  {user.plan}
                </Badge>
                {user.emailVerified ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <Badge variant="neutral">Unverified</Badge>
                )}
                {user.isAdmin && <Badge variant="danger">ADMIN</Badge>}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 mt-6 pt-4 space-y-2.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Account ID</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 select-all">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Joined Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              {user.planValidUntil && (
                <div className="flex justify-between">
                  <span>Plan Expires</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(user.planValidUntil).toLocaleDateString()}
                  </span>
                </div>
              )}
              {user.isSuspended && user.suspendedReason && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-2.5 rounded border border-red-100 dark:border-red-950/40 text-[11px] mt-2">
                  <div className="font-bold flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    <span>Suspension Reason:</span>
                  </div>
                  <div className="mt-1">{user.suspendedReason}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Action Panel */}
          <Card className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Control Actions</h3>

            <div className="space-y-2 flex flex-col">
              {/* Verification Toggle */}
              {user.emailVerified ? (
                <Button
                  variant="outline"
                  onClick={() => openActionModal('unverify-email')}
                  leftIcon={<XCircle className="h-4 w-4" />}
                  className="justify-start h-9"
                >
                  Unverify Email Status
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => openActionModal('verify-email')}
                  leftIcon={<CheckCircle className="h-4 w-4" />}
                  className="justify-start h-9 text-green-600 hover:text-green-700"
                >
                  Verify Email Manually
                </Button>
              )}

              {/* Resend Verification Code */}
              {!user.emailVerified && (
                <Button
                  variant="outline"
                  onClick={() => openActionModal('resend-verification')}
                  leftIcon={<Send className="h-4 w-4" />}
                  className="justify-start h-9"
                >
                  Resend Verification OTP
                </Button>
              )}

              {/* Change Subscription Plan */}
              <Button
                variant="outline"
                onClick={() => openActionModal('change-plan')}
                leftIcon={<CreditCard className="h-4 w-4" />}
                className="justify-start h-9"
              >
                Modify Subscription Plan
              </Button>

              {/* Suspension Toggle */}
              {user.isSuspended ? (
                <Button
                  variant="outline"
                  onClick={() => openActionModal('unsuspend')}
                  leftIcon={<Unlock className="h-4 w-4" />}
                  className="justify-start h-9 text-green-600 hover:text-green-700"
                >
                  Unsuspend Account
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => openActionModal('suspend')}
                  leftIcon={<Ban className="h-4 w-4" />}
                  className="justify-start h-9 text-red-650 hover:text-red-700"
                >
                  Suspend Account
                </Button>
              )}

              {/* Revoke All Sessions */}
              <Button
                variant="outline"
                onClick={() => openActionModal('revoke-sessions')}
                leftIcon={<Trash2 className="h-4 w-4" />}
                className="justify-start h-9 text-red-650 hover:text-red-700"
              >
                Force Logout (Revoke Sessions)
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Side: Tab container */}
        <div className="md:col-span-2 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 flex gap-4">
            <button
              onClick={() => setActiveTab('forms')}
              className={`pb-3 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'forms'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-850'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Forms ({detail.formsCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`pb-3 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'api-keys'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-850'
              }`}
            >
              <Key className="h-4 w-4" />
              <span>API Keys ({detail.apiKeysCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`pb-3 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'webhooks'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-850'
              }`}
            >
              <Webhook className="h-4 w-4" />
              <span>Webhooks ({detail.webhooksCount})</span>
            </button>
          </div>

          {/* Forms Tab */}
          {activeTab === 'forms' && (
            <Card padded={false} className="overflow-hidden">
              {detail.forms.length === 0 ? (
                <div className="p-8 text-center text-slate-500">This user has not created any forms yet.</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 font-medium">
                      <th className="px-6 py-2.5">Title</th>
                      <th className="px-6 py-2.5">Status</th>
                      <th className="px-6 py-2.5">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                    {detail.forms.map((form) => (
                      <tr key={form.id} className="hover:bg-slate-50/30">
                        <td className="px-6 py-3 font-medium">
                          <div className="flex flex-col">
                            <span>{form.title}</span>
                            <span className="text-xs text-slate-400">/{form.slug}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <Badge
                            variant={
                              form.status === 'PUBLISHED'
                                ? 'success'
                                : form.status === 'CLOSED'
                                ? 'danger'
                                : 'neutral'
                            }
                          >
                            {form.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-slate-400 text-xs">
                          {new Date(form.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <Card padded={false} className="overflow-hidden">
              {detail.apiKeys.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No API keys registered for this user.</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 font-medium">
                      <th className="px-6 py-2.5">Key Name</th>
                      <th className="px-6 py-2.5">Prefix</th>
                      <th className="px-6 py-2.5">Last Used</th>
                      <th className="px-6 py-2.5">Status</th>
                      <th className="px-6 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                    {detail.apiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-slate-50/30">
                        <td className="px-6 py-3 font-medium">{key.name}</td>
                        <td className="px-6 py-3 font-mono text-xs">{key.keyPrefix}...</td>
                        <td className="px-6 py-3 text-slate-400 text-xs">
                          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-6 py-3">
                          {key.revokedAt ? (
                            <Badge variant="danger">Revoked</Badge>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {!key.revokedAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-650 hover:text-red-700 h-8"
                              onClick={() => openActionModal('revoke-key', key.id)}
                            >
                              Revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <Card padded={false} className="overflow-hidden">
              {detail.webhooks.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No webhooks configured for this user.</div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 font-medium">
                      <th className="px-6 py-2.5">Endpoint URL</th>
                      <th className="px-6 py-2.5">Failures</th>
                      <th className="px-6 py-2.5">Status</th>
                      <th className="px-6 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                    {detail.webhooks.map((wh) => (
                      <tr key={wh.id} className="hover:bg-slate-50/30">
                        <td className="px-6 py-3">
                          <div className="flex flex-col truncate max-w-sm">
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate select-all">{wh.url}</span>
                            <span className="text-xs text-slate-400">Form: {wh.formId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          {wh.failureCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">{wh.failureCount} fails</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {wh.autoDisabledAt ? (
                            <Badge variant="danger">Auto-Disabled</Badge>
                          ) : wh.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="neutral">Disabled</Badge>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {wh.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-650 hover:text-red-700 h-8"
                              onClick={() => openActionModal('disable-webhook', wh.id)}
                            >
                              Disable
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Action Dialog / Modal wrapper */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={
          modalType === 'verify-email'
            ? 'Verify Email Address'
            : modalType === 'unverify-email'
            ? 'Mark Email as Unverified'
            : modalType === 'resend-verification'
            ? 'Resend Verification Code'
            : modalType === 'change-plan'
            ? 'Modify Subscription Plan'
            : modalType === 'suspend'
            ? 'Suspend User Account'
            : modalType === 'unsuspend'
            ? 'Unsuspend User Account'
            : modalType === 'revoke-sessions'
            ? 'Force Terminate Sessions'
            : modalType === 'revoke-key'
            ? 'Revoke API Access Key'
            : modalType === 'disable-webhook'
            ? 'Disable Webhook Endpoint'
            : 'Confirm Action'
        }
        description={
          modalType === 'resend-verification'
            ? 'This will email a new verification OTP directly to the user.'
            : 'All administrative alterations must specify a reason for audit trails.'
        }
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant={
                modalType === 'suspend' ||
                modalType === 'revoke-sessions' ||
                modalType === 'revoke-key' ||
                modalType === 'disable-webhook'
                  ? 'danger'
                  : 'primary'
              }
              size="sm"
              loading={actionLoading}
              onClick={handleActionSubmit}
            >
              Confirm Action
            </Button>
          </>
        }
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {/* Modify plan inputs */}
          {modalType === 'change-plan' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Plan Tier</label>
                <Select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as UserPlan)}
                  className="w-full h-10"
                  options={[
                    { value: 'FREE', label: 'FREE' },
                    { value: 'PRO', label: 'PRO' },
                    { value: 'ENTERPRISE', label: 'ENTERPRISE' },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Expires On (Optional)</label>
                <Input
                  type="date"
                  value={planValidUntil}
                  onChange={(e) => setPlanValidUntil(e.target.value)}
                  className="w-full h-10"
                />
              </div>
            </div>
          )}

          {/* Reason Input */}
          {modalType !== 'resend-verification' && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Reason for Action</label>
              <Textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why this modification is being made..."
                rows={3}
                className="w-full"
              />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
