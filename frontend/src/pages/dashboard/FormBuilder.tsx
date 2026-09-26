import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Send, Settings, BarChart2, Share2, Loader2, Plus, SlidersHorizontal, Layers } from 'lucide-react';
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
  const [mobileDrawer, setMobileDrawer] = useState<'palette' | 'settings' | null>(null);

  const loadForm = useBuilderStore((s) => s.loadForm);
  const reset = useBuilderStore((s) => s.reset);
  const title = useBuilderStore((s) => s.title);
  const isDirty = useBuilderStore((s) => s.isDirty);
  const isSaving = useBuilderStore((s) => s.isSaving);
  const lastSavedAt = useBuilderStore((s) => s.lastSavedAt);
  const fields = useBuilderStore((s) => s.fields);
  const theme = useBuilderStore((s) => s.theme);
  const selectedFieldId = useBuilderStore((s) => s.selectedFieldId);

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsApi.get(id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (form) loadForm(form);
    return () => reset();
  }, [form, loadForm, reset]);

  useEffect(() => {
    if (selectedFieldId && window.innerWidth < 1024) {
      setMobileDrawer('settings');
    }
  }, [selectedFieldId]);

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
      ? 'Unsaved'
      : lastSavedAt
        ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Saved';

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-slate-950">
      {/* Responsive Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-4 dark:border-slate-800 dark:bg-slate-900 shrink-0">
        {/* Left: Back & Form Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/dashboard/forms"
            aria-label="Back to forms"
            className="rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100 max-w-[100px] sm:max-w-[180px] md:max-w-[280px]">
              {title || 'Untitled form'}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-slate-400">{savedLabel}</div>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto px-1 py-1 no-scrollbar">
          <Link
            to={`/dashboard/forms/${id}`}
            className="rounded-md bg-brand-50 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200 whitespace-nowrap"
          >
            Build
          </Link>
          <Link
            to={`/dashboard/forms/${id}/responses`}
            className="rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Responses
          </Link>
          <Link
            to={`/dashboard/forms/${id}/analytics`}
            className="hidden md:inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Analytics
          </Link>
          <Link
            to={`/dashboard/forms/${id}/share`}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Link>
          <Link
            to={`/dashboard/forms/${id}/settings`}
            className="hidden sm:inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            leftIcon={<Eye className="h-3.5 w-3.5" />}
            className="px-2.5 sm:px-3 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button
            size="sm"
            onClick={() => publishMutation.mutate()}
            loading={publishMutation.isPending}
            leftIcon={<Send className="h-3.5 w-3.5" />}
            disabled={fields.filter((f) => f.type !== 'HEADING' && f.type !== 'DIVIDER').length === 0}
            className="px-2.5 sm:px-3 text-xs sm:text-sm"
          >
            Publish
          </Button>
        </div>
      </header>

      {/* Main Builder Area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop Left Palette */}
        <div className="hidden lg:block h-full">
          <FieldPalette />
        </div>

        {/* Center Canvas */}
        <div className="flex flex-1 flex-col h-full overflow-hidden">
          <Canvas />
        </div>

        {/* Desktop Right Settings Panel */}
        <div className="hidden lg:block h-full">
          <FieldSettingsPanel />
        </div>
      </div>

      {/* Mobile / Tablet Floating Dock for Sidebars (< 1024px) */}
      <div className="flex lg:hidden items-center justify-around border-t border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-2 shrink-0 z-20 shadow-lg">
        <button
          type="button"
          onClick={() => setMobileDrawer('palette')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            mobileDrawer === 'palette' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-600 dark:text-slate-400'
          }`}
        >
          <Plus className="h-5 w-5" />
          <span>Add Fields</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileDrawer(null)}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            mobileDrawer === null ? 'text-brand-600 dark:text-brand-400' : 'text-gray-600 dark:text-slate-400'
          }`}
        >
          <Layers className="h-5 w-5" />
          <span>Canvas</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileDrawer('settings')}
          className={`relative flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            mobileDrawer === 'settings' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-600 dark:text-slate-400'
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span>Settings</span>
          {selectedFieldId && (
            <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>
      </div>

      {/* Mobile Drawer Slide-Over Sheet (Left: Palette) */}
      {mobileDrawer === 'palette' && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-fade-in" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setMobileDrawer(null)} />
          <div className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl animate-slide-right">
            <FieldPalette isMobileDrawer onCloseMobile={() => setMobileDrawer(null)} />
          </div>
        </div>
      )}

      {/* Mobile Drawer Slide-Over Sheet (Right: Settings) */}
      {mobileDrawer === 'settings' && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden animate-fade-in" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setMobileDrawer(null)} />
          <div className="relative w-88 max-w-[88vw] h-full bg-white dark:bg-slate-900 shadow-2xl animate-slide-left">
            <FieldSettingsPanel isMobileDrawer onCloseMobile={() => setMobileDrawer(null)} />
          </div>
        </div>
      )}

      {/* Form Preview Modal */}
      <Modal open={previewOpen} onOpenChange={setPreviewOpen} title="Form preview" size="xl">
        <div className="-mx-6 -my-4 max-h-[70vh] overflow-y-auto bg-gray-50 dark:bg-slate-950">
          <FormRenderer
            form={{ ...form, title, fields, theme, settings: form.settings }}
            onSubmit={() => { toast('This is a preview - submissions are disabled.'); }}
            isPreview
            branding
          />
        </div>
      </Modal>
    </div>
  );
}
