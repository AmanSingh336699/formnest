import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { usersApi } from '../../api/services/users.service';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export function DangerZonePage(): JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);

  const deleteMut = useMutation({
    mutationFn: () => usersApi.deleteMe(),
    onSuccess: () => {
      toast.success('Account deleted');
      clear();
      navigate('/');
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Danger zone</h1>
      <Card className="border-red-200">
        <h2 className="text-base font-semibold text-red-600">Delete account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Permanently delete your account, all your forms, responses, webhooks, and API keys. This action cannot be undone.
        </p>
        <Button className="mt-4" variant="danger" onClick={() => setConfirmOpen(true)}>Delete my account</Button>
      </Card>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete account?"
        description="All your forms, responses, and data will be permanently deleted. There is no recovery."
        destructive
        confirmLabel="Yes, delete forever"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
