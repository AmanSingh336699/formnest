import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { formsApi } from '../../api/services/forms.service';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import toast from 'react-hot-toast';

export function FormSettingsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: form } = useQuery({ queryKey: ['form', id], queryFn: () => formsApi.get(id as string), enabled: !!id });

  const [customSlug, setCustomSlug] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [closedMessage, setClosedMessage] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [notifyOnResponse, setNotifyOnResponse] = useState(false);
  const [maxResponses, setMaxResponses] = useState('');

  // Initialize once form loads
  if (form && customSlug === '' && form.customSlug !== null && form.customSlug !== undefined) {
    setCustomSlug(form.customSlug);
    setSuccessMessage(form.settings?.successMessage ?? '');
    setClosedMessage(form.settings?.closedMessage ?? '');
    setRedirectUrl(form.settings?.redirectUrl ?? '');
    setNotifyOnResponse(form.settings?.notifyOnResponse ?? false);
    setMaxResponses(form.settings?.maxResponses ? String(form.settings.maxResponses) : '');
  }

  const saveMut = useMutation({
    mutationFn: () =>
      formsApi.update(id as string, {
        customSlug: customSlug || null,
        settings: {
          ...(form?.settings ?? {}),
          successMessage: successMessage || undefined,
          closedMessage: closedMessage || undefined,
          redirectUrl: redirectUrl || undefined,
          notifyOnResponse,
          maxResponses: maxResponses ? Number(maxResponses) : undefined,
        },
      }),
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['form', id] });
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Save failed'),
  });

  const closeMut = useMutation({
    mutationFn: () => formsApi.close(id as string),
    onSuccess: () => {
      toast.success('Form closed');
      qc.invalidateQueries({ queryKey: ['form', id] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to={`/dashboard/forms/${id}`} className="rounded-md p-1.5 hover:bg-gray-100"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-semibold text-gray-900">Form settings</h1>
      </div>

      <Card className="mb-4 space-y-4">
        <h2 className="text-base font-semibold">URL</h2>
        <Input
          label="Custom slug (Pro)"
          value={customSlug}
          onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="my-survey"
          helpText="Lowercase letters, digits, hyphens. Leave blank for auto-generated."
        />
      </Card>

      <Card className="mb-4 space-y-4">
        <h2 className="text-base font-semibold">Submission</h2>
        <Textarea
          label="Success message"
          value={successMessage}
          onChange={(e) => setSuccessMessage(e.target.value)}
          placeholder="Thanks for your response!"
        />
        <Input
          label="Redirect URL (https only)"
          value={redirectUrl}
          onChange={(e) => setRedirectUrl(e.target.value)}
          placeholder="https://yoursite.com/thanks"
        />
        <Input
          label="Max responses"
          type="number"
          value={maxResponses}
          onChange={(e) => setMaxResponses(e.target.value)}
          helpText="Optional limit. Form auto-closes after reaching it."
        />
        <Textarea
          label="Closed message"
          value={closedMessage}
          onChange={(e) => setClosedMessage(e.target.value)}
          placeholder="This form is no longer accepting responses."
        />
      </Card>

      <Card className="mb-4">
        <h2 className="mb-3 text-base font-semibold">Notifications</h2>
        <Switch
          checked={notifyOnResponse}
          onChange={setNotifyOnResponse}
          label="Email me when a response is submitted"
          description="Sends to your account email"
        />
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="danger" onClick={() => closeMut.mutate()} loading={closeMut.isPending}>
          Close form
        </Button>
        <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>Save settings</Button>
      </div>
    </div>
  );
}
