import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useCopyToClipboard(): { copied: boolean; copy: (text: string, successMessage?: string) => Promise<void> } {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string, successMessage = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(successMessage);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  return { copied, copy };
}
