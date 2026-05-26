import { Type, AlignLeft, Mail, Hash, Phone, Circle, Check, ChevronDown, Calendar, Star, ToggleRight, Heading2, Minus } from 'lucide-react';
import type { FieldType } from '../../types';
import { useBuilderStore } from '../../store/builderStore';

interface PaletteItem {
  type: FieldType;
  label: string;
  icon: typeof Type;
  category: 'basic' | 'choice' | 'datetime' | 'special' | 'layout';
}

const PALETTE: PaletteItem[] = [
  { type: 'TEXT_SHORT', label: 'Short text', icon: Type, category: 'basic' },
  { type: 'TEXT_LONG', label: 'Long text', icon: AlignLeft, category: 'basic' },
  { type: 'EMAIL', label: 'Email', icon: Mail, category: 'basic' },
  { type: 'NUMBER', label: 'Number', icon: Hash, category: 'basic' },
  { type: 'PHONE', label: 'Phone', icon: Phone, category: 'basic' },
  { type: 'RADIO', label: 'Single choice', icon: Circle, category: 'choice' },
  { type: 'CHECKBOX', label: 'Multiple choice', icon: Check, category: 'choice' },
  { type: 'DROPDOWN', label: 'Dropdown', icon: ChevronDown, category: 'choice' },
  { type: 'DATE', label: 'Date', icon: Calendar, category: 'datetime' },
  { type: 'RATING', label: 'Rating', icon: Star, category: 'special' },
  { type: 'YES_NO', label: 'Yes / No', icon: ToggleRight, category: 'special' },
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

export function FieldPalette(): JSX.Element {
  const addField = useBuilderStore((s) => s.addField);
  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white" aria-label="Add fields">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Add a field</h2>
        <p className="mt-0.5 text-xs text-gray-500">Click or drag onto the canvas.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {CATEGORIES.map((cat) => {
          const items = PALETTE.filter((p) => p.category === cat.key);
          return (
            <div key={cat.key} className="mb-4">
              <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{cat.label}</h3>
              <div className="mt-1.5 space-y-1">
                {items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => addField(item.type)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:bg-brand-50"
                  >
                    <item.icon className="h-4 w-4 text-gray-400" />
                    <span>{item.label}</span>
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
