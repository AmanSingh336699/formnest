import { useState, useEffect } from 'react';
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

  // Form डेटा लोड होने पर स्टेट्स को केवल एक बार इनिशियलाइज़ करें
  useEffect(() => {
    if (form) {
      setCustomSlug(form.customSlug ?? '');
      setSuccessMessage(form.settings?.successMessage ?? '');
      setClosedMessage(form.settings?.closedMessage ?? '');
      setRedirectUrl(form.settings?.redirectUrl ?? '');
      setNotifyOnResponse(form.settings?.notifyOnResponse ?? false);
      setMaxResponses(form.settings?.maxResponses ? String(form.settings.maxResponses) : '');
    }
  }, [form]);

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
    <div className="mx-auto max-w-[1600px] px-4 py-6 text-slate-850 dark:text-slate-100">
      {/* Top Header Section */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            to={`/dashboard/forms/${id}`}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Form settings</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure parameters, restrictions, and behaviors for your form</p>
          </div>
        </div>
        
        {/* Responsive Header Actions */}
        <div className="flex items-center gap-3">
          <Button 
            variant="danger" 
            onClick={() => closeMut.mutate()} 
            loading={closeMut.isPending}
            className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 dark:border-red-900/50"
          >
            Close form
          </Button>
          <Button 
            onClick={() => saveMut.mutate()} 
            loading={saveMut.isPending}
            className="px-5 py-2 text-sm"
          >
            Save settings
          </Button>
        </div>
      </div>

      {/* Main Grid Layout to prevent scrolling */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Left Column: URL & Notifications */}
        <div className="space-y-6 lg:col-span-5">
          {/* URL Configurations Card */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 rounded-xl shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">URL Configurations</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Set up a clean custom slug for sharing your form.</p>
            <Input
              label="Custom slug (Pro)"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-surveytest"
              helpText="Lowercase letters, digits, and hyphens. Leave blank for an auto-generated link."
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-700"
            />
          </Card>

          {/* Notifications Card */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 rounded-xl shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Notifications</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Keep track of incoming responses in real-time.</p>
            <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 p-3 border border-slate-100 dark:border-slate-800/60">
              <Switch
                checked={notifyOnResponse}
                onChange={setNotifyOnResponse}
                label="Email notifications"
                description="Sends response alerts directly to your account email."
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Submission Controls */}
        <div className="lg:col-span-7">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 rounded-xl shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Submission Handling</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure what users see and where they go after completing the form.</p>
            </div>

            <Textarea
              label="Success message"
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              placeholder="Thanks for your response!"
              rows={2}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Redirect URL (https only)"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://yoursite.com/thanks"
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
              <Input
                label="Max responses"
                type="number"
                value={maxResponses}
                onChange={(e) => setMaxResponses(e.target.value)}
                placeholder="Unlimited"
                helpText="Optional response limit constraint."
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <Textarea
              label="Closed message"
              value={closedMessage}
              onChange={(e) => setClosedMessage(e.target.value)}
              placeholder="This form is no longer accepting responses."
              rows={2}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </Card>
        </div>
        
      </div>
    </div>
  );
}
