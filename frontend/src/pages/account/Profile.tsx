import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  if (user && !name) setName(user.name);

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
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Profile</h1>

      <Card className="mb-6 space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" value={user?.email ?? ''} disabled helpText="Email cannot be changed yet" />
        <div className="flex justify-end">
          <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>Save</Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold">Change password</h2>
        <Input type="password" label="Current password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} />
        <Input
          type="password"
          label="New password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          helpText="Min 10 chars with 3 of: uppercase, lowercase, digit, symbol"
        />
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
  );
}
