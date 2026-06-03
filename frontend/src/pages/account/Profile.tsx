import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { usersApi } from '../../api/services/users.service';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export function ProfilePage(): JSX.Element {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => usersApi.me() });
  const [name, setName] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Sync name from server once data loads (not during render to avoid stale-data bugs)
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const saveMut = useMutation({
    mutationFn: () => usersApi.updateMe({ name }),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setUser(u);
      toast.success('Profile updated');
    },
  });

  const passMut = useMutation({
    mutationFn: () => usersApi.changePassword(currentPass, newPass),
    onSuccess: () => {
      toast.success('Password changed. Please sign in again.');
      setCurrentPass('');
      setNewPass('');
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Change failed'),
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage account details and security settings.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">Account details</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your public name and sign-in email.</p>
          </div>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={user?.email ?? ''} disabled helpText="Email cannot be changed yet" />
          <div className="flex justify-end">
            <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>Save</Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-100">Change password</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use a strong password with a mix of character types.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type={showCurrentPass ? 'text' : 'password'}
              label="Current password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowCurrentPass((s) => !s)}
                  className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showCurrentPass ? 'Hide current password' : 'Show current password'}
                >
                  {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              inputClassName="pr-10"
            />

            <Input
              type={showNewPass ? 'text' : 'password'}
              label="New password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              helpText="Min 6 chars with 3 of: uppercase, lowercase, digit, symbol"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowNewPass((s) => !s)}
                  className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showNewPass ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              inputClassName="pr-10"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => passMut.mutate()}
              loading={passMut.isPending}
              disabled={!currentPass || !newPass}
            >
              Change password
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
