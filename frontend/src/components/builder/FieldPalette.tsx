import { Type, AlignLeft, Mail, Hash, Phone, Circle, Check, ChevronDown, Calendar, Star, ToggleRight, Heading2, Minus, LockKeyhole, UploadCloud, X } from 'lucide-react';
import type { FieldType } from '../../types';
import { useBuilderStore } from '../../store/builderStore';
import toast from 'react-hot-toast';

interface PaletteItem {
  type: FieldType;
  label: string;
  icon: typeof Type;
  category: 'basic' | 'choice' | 'datetime' | 'special' | 'layout';
}

const PALETTE: PaletteItem[] = [
  { type: 'TEXT_SHORT', label: 'Short text', icon: Type, category: 'basic' },
  { type: 'TEXT_LONG', label: 'Long text', icon: AlignLeft, category: 'basic' },
  { type: 'PASSWORD', label: 'Password', icon: LockKeyhole, category: 'basic' },
  { type: 'EMAIL', label: 'Email', icon: Mail, category: 'basic' },
  { type: 'NUMBER', label: 'Number', icon: Hash, category: 'basic' },
  { type: 'PHONE', label: 'Phone', icon: Phone, category: 'basic' },
  { type: 'RADIO', label: 'Single choice', icon: Circle, category: 'choice' },
  { type: 'CHECKBOX', label: 'Multiple choice', icon: Check, category: 'choice' },
  { type: 'DROPDOWN', label: 'Dropdown', icon: ChevronDown, category: 'choice' },
  { type: 'DATE', label: 'Date', icon: Calendar, category: 'datetime' },
  { type: 'RATING', label: 'Rating', icon: Star, category: 'special' },
  { type: 'YES_NO', label: 'Yes / No', icon: ToggleRight, category: 'special' },
  { type: 'FILE_UPLOAD', label: 'File upload', icon: UploadCloud, category: 'special' },
  { type: 'HEADING', label: 'Heading', icon: Heading2, category: 'layout' },
  { type: 'DIVIDER', label: 'Divider', icon: Minus, category: 'layout' },
];

const CATEGORIES: Array<{ key: PaletteItem['category']; label: string }> = [
  { key: 'basic', label: 'Basic' },
  { key: 'choice', label: 'Choice' },
  { key: 'datetime', label: 'Date & time' },
  { key: 'special', label: 'Specialized' },
  { key: 'layout', label: 'Layout' },
];

interface FieldPaletteProps {
  onCloseMobile?: () => void;
  isMobileDrawer?: boolean;
}

export function FieldPalette({ onCloseMobile, isMobileDrawer }: FieldPaletteProps): JSX.Element {
  const addField = useBuilderStore((s) => s.addField);

  const handleAddField = (type: FieldType, label: string) => {
    addField(type);
    if (isMobileDrawer) {
      toast.success(`Added ${label}`);
      onCloseMobile?.();
    }
  };

  return (
    <aside
      className="flex h-full w-full flex-col border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:w-64"
      aria-label="Add fields"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Add a field</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">Click to add onto canvas.</p>
        </div>
        {isMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close palette"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {CATEGORIES.map((cat) => {
          const items = PALETTE.filter((p) => p.category === cat.key);
          return (
            <div key={cat.key} className="mb-4">
              <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                {cat.label}
              </h3>
              <div className="mt-1.5 space-y-1">
                {items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddField(item.type, item.label)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:bg-brand-50 dark:text-slate-200 dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-slate-400" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
