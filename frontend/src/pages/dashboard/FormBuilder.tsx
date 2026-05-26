import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Send, Settings, BarChart2, Share2, Loader2 } from 'lucide-react';
import { formsApi } from '../../api/services/forms.service';
import { FieldPalette } from '../../components/builder/FieldPalette';
import { Canvas } from '../../components/builder/Canvas';
import { FieldSettingsPanel } from '../../components/builder/FieldSettingsPanel';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useBuilderStore } from '../../store/builderStore';
import { useAutoSave } from '../../hooks/useAutoSave';
import { FormRenderer } from '../../components/renderer/FormRenderer';
import toast from 'react-hot-toast';

export function FormBuilderPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const loadForm = useBuilderStore((s) => s.loadForm);
  const reset = useBuilderStore((s) => s.reset);
  const title = useBuilderStore((s) => s.title);
  const isDirty = useBuilderStore((s) => s.isDirty);
  const isSaving = useBuilderStore((s) => s.isSaving);
  const lastSavedAt = useBuilderStore((s) => s.lastSavedAt);
  const fields = useBuilderStore((s) => s.fields);
  const theme = useBuilderStore((s) => s.theme);

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsApi.get(id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (form) loadForm(form);
    return () => reset();
  }, [form, loadForm, reset]);

  useAutoSave();

  const publishMutation = useMutation({
    mutationFn: () => formsApi.publish(id as string),
    onSuccess: (f) => {
      toast.success('Form published!');
      qc.invalidateQueries({ queryKey: ['form', id] });
      navigate(`/dashboard/forms/${f.id}/share`);
    },
    onError: (err: { message?: string }) => toast.error(err.message ?? 'Publish failed'),
  });

  if (isLoading || !form) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  const savedLabel = isSaving
    ? 'Saving...'
    : isDirty
      ? 'Unsaved changes'
      : lastSavedAt
        ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
        : 'Saved';

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/forms" aria-label="Back" className="rounded-md p-1.5 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Link>
          <div>
            <div className="text-sm font-medium text-gray-900">{title || 'Untitled form'}</div>
            <div className="text-xs text-gray-500">{savedLabel}</div>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Link to={`/dashboard/forms/${id}`} className="rounded-md px-3 py-1.5 text-sm font-medium text-brand-700 bg-brand-50">Build</Link>
          <Link to={`/dashboard/forms/${id}/responses`} className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">Responses</Link>
          <Link to={`/dashboard/forms/${id}/analytics`} className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
            <span className="inline-flex items-center gap-1"><BarChart2 className="h-3.5 w-3.5" />Analytics</span>
          </Link>
          <Link to={`/dashboard/forms/${id}/share`} className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
            <span className="inline-flex items-center gap-1"><Share2 className="h-3.5 w-3.5" />Share</span>
          </Link>
          <Link to={`/dashboard/forms/${id}/settings`} className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
            <span className="inline-flex items-center gap-1"><Settings className="h-3.5 w-3.5" />Settings</span>
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} leftIcon={<Eye className="h-4 w-4" />}>
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => publishMutation.mutate()}
            loading={publishMutation.isPending}
            leftIcon={<Send className="h-4 w-4" />}
            disabled={fields.filter((f) => f.type !== 'HEADING' && f.type !== 'DIVIDER').length === 0}
          >
            Publish
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <FieldPalette />
        <Canvas />
        <FieldSettingsPanel />
      </div>

      <Modal open={previewOpen} onOpenChange={setPreviewOpen} title="Form preview" size="xl">
        <div className="-mx-6 -my-4 max-h-[70vh] overflow-y-auto bg-gray-50">
          <FormRenderer
            form={{ ...form, title, fields, theme, settings: form.settings }}
            onSubmit={() => toast('This is a preview — submissions are disabled.')}
            isPreview
            branding
          />
        </div>
      </Modal>
    </div>
  );
}
