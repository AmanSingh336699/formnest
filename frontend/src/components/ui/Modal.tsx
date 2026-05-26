import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: ModalProps): JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)] rounded-xl bg-white shadow-2xl animate-slide-up',
            sizeClasses[size],
          )}
        >
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-gray-500">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="px-6 py-4">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
