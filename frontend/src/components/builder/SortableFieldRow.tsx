import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Copy, Trash2 } from 'lucide-react';
import type { FormField } from '../../types';
import { FieldRenderer } from '../renderer/FieldRenderer';
import { cn } from '../../lib/cn';

interface SortableFieldRowProps {
  field: FormField;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SortableFieldRow({ field, selected, onSelect, onDuplicate, onDelete }: SortableFieldRowProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={cn(
        'group relative rounded-lg border bg-white p-4 transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        selected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-gray-200 hover:border-gray-300',
        isDragging && 'opacity-50',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute -left-7 top-1/2 -translate-y-1/2 cursor-grab rounded p-1 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-500 active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <FieldRenderer field={field} value={null} onChange={() => undefined} disabled />

      {selected && (
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Duplicate field"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete field"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
