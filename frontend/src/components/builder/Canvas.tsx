import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useBuilderStore } from '../../store/builderStore';
import { SortableFieldRow } from './SortableFieldRow';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { LayoutPanelLeft } from 'lucide-react';

export function Canvas(): JSX.Element {
  const fields = useBuilderStore((s) => s.fields);
  const moveField = useBuilderStore((s) => s.moveField);
  const removeField = useBuilderStore((s) => s.removeField);
  const duplicateField = useBuilderStore((s) => s.duplicateField);
  const selectField = useBuilderStore((s) => s.selectField);
  const selectedFieldId = useBuilderStore((s) => s.selectedFieldId);
  const title = useBuilderStore((s) => s.title);
  const setTitle = useBuilderStore((s) => s.setTitle);
  const description = useBuilderStore((s) => s.description);
  const setDescription = useBuilderStore((s) => s.setDescription);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      // We use Zustand action, which will reorder
      moveField(oldIndex, newIndex);
      // arrayMove not needed because moveField handles it
      void arrayMove;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled form"
            aria-label="Form title"
            className="w-full bg-transparent text-2xl font-semibold text-gray-900 outline-none placeholder:text-gray-300"
          />
          <textarea
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value || null)}
            placeholder="Add a description (optional)"
            aria-label="Form description"
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-300"
          />
        </div>

        {fields.length === 0 ? (
          <EmptyState
            icon={LayoutPanelLeft}
            title="No fields yet"
            description="Add fields from the left panel to start building your form."
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {fields.map((field) => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    selected={selectedFieldId === field.id}
                    onSelect={() => selectField(field.id)}
                    onDuplicate={() => duplicateField(field.id)}
                    onDelete={() => setDeleteId(field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete field?"
        description="This action cannot be undone. The field will be removed from your form."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) removeField(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
