/**
 * Auto-save hook with debounce + exponential backoff retry.
 */
import { useEffect, useRef } from 'react';
import { useBuilderStore } from '../store/builderStore';
import { formsApi } from '../api/services/forms.service';
import toast from 'react-hot-toast';

const DEBOUNCE_MS = 2000;
const RETRY_DELAYS = [1000, 3000, 8000, 20_000];

export function useAutoSave(): void {
  const formId = useBuilderStore((s) => s.formId);
  const isDirty = useBuilderStore((s) => s.isDirty);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const inflightRef = useRef(false);

  useEffect(() => {
    if (!formId || !isDirty) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      const state = useBuilderStore.getState();
      state.markSaving(true);
      try {
        await formsApi.update(state.formId as string, {
          title: state.title,
          description: state.description,
          fields: state.fields,
          theme: state.theme,
          settings: state.settings,
        });
        state.markClean();
        retryCountRef.current = 0;
      } catch {
        const idx = Math.min(retryCountRef.current, RETRY_DELAYS.length - 1);
        const delay = RETRY_DELAYS[idx] ?? 20_000;
        retryCountRef.current += 1;
        toast.error('Changes not saved — retrying...', { id: 'autosave-retry' });
        setTimeout(() => {
          useBuilderStore.setState({ isDirty: true });
        }, delay);
      } finally {
        state.markSaving(false);
        inflightRef.current = false;
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formId, isDirty]);
}
