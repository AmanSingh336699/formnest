import { Switch as HSwitch } from '@headlessui/react';
import { cn } from '../../lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps): JSX.Element {
  return (
    <HSwitch.Group as="div" className="flex items-center justify-between gap-4">
      {(label || description) && (
        <span className="flex flex-grow flex-col">
          {label && <HSwitch.Label as="span" className="text-sm font-medium text-gray-900">{label}</HSwitch.Label>}
          {description && <HSwitch.Description as="span" className="text-xs text-gray-500">{description}</HSwitch.Description>}
        </span>
      )}
      <HSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          checked ? 'bg-brand-600' : 'bg-gray-200',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </HSwitch>
    </HSwitch.Group>
  );
}
