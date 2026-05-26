import { useBuilderStore } from '../../store/builderStore';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Trash2, Plus } from 'lucide-react';
import type { FieldOption, FormField } from '../../types';

function newOption(): FieldOption {
  return { id: `opt_${Math.random().toString(36).slice(2, 8)}`, label: 'New option', value: `option-${Date.now().toString(36)}` };
}

export function FieldSettingsPanel(): JSX.Element {
  const selectedId = useBuilderStore((s) => s.selectedFieldId);
  const fields = useBuilderStore((s) => s.fields);
  const updateField = useBuilderStore((s) => s.updateField);

  const field = fields.find((f) => f.id === selectedId);

  if (!field) {
    return (
      <aside className="hidden h-full w-80 flex-col border-l border-gray-200 bg-white lg:flex" aria-label="Field settings">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Field settings</h2>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-gray-500">Select a field to edit its settings.</p>
        </div>
      </aside>
    );
  }

  const hasChoices = field.type === 'RADIO' || field.type === 'CHECKBOX' || field.type === 'DROPDOWN';
  const isInput = field.type !== 'HEADING' && field.type !== 'DIVIDER';

  return (
    <aside className="hidden h-full w-80 flex-col border-l border-gray-200 bg-white lg:flex" aria-label="Field settings">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Field settings</h2>
        <p className="mt-0.5 text-xs text-gray-500 capitalize">{field.type.toLowerCase().replace('_', ' ')}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Input
          label="Label"
          value={field.label}
          onChange={(e) => updateField(field.id, { label: e.target.value })}
          maxLength={200}
          required
        />

        {isInput && (
          <Input
            label="Placeholder"
            value={field.placeholder ?? ''}
            onChange={(e) => updateField(field.id, { placeholder: e.target.value || null })}
            maxLength={200}
          />
        )}

        <Textarea
          label="Help text"
          value={field.helpText ?? ''}
          onChange={(e) => updateField(field.id, { helpText: e.target.value || null })}
          maxLength={500}
        />

        {isInput && (
          <Switch
            checked={field.required}
            onChange={(checked) => updateField(field.id, { required: checked })}
            label="Required"
            description="User must complete this field"
          />
        )}

        {field.type === 'NUMBER' && (
          <div className="space-y-3 rounded-lg bg-gray-50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Validation</h3>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Min"
                type="number"
                value={field.validation?.min ?? ''}
                onChange={(e) => updateField(field.id, {
                  validation: { ...field.validation, min: e.target.value === '' ? undefined : Number(e.target.value) },
                })}
              />
              <Input
                label="Max"
                type="number"
                value={field.validation?.max ?? ''}
                onChange={(e) => updateField(field.id, {
                  validation: { ...field.validation, max: e.target.value === '' ? undefined : Number(e.target.value) },
                })}
              />
            </div>
            <Switch
              checked={!!field.validation?.integerOnly}
              onChange={(checked) => updateField(field.id, { validation: { ...field.validation, integerOnly: checked } })}
              label="Integer only"
            />
          </div>
        )}

        {(field.type === 'TEXT_SHORT' || field.type === 'TEXT_LONG') && (
          <div className="space-y-3 rounded-lg bg-gray-50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Validation</h3>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Min length"
                type="number"
                value={field.validation?.minLength ?? ''}
                onChange={(e) => updateField(field.id, {
                  validation: { ...field.validation, minLength: e.target.value === '' ? undefined : Number(e.target.value) },
                })}
              />
              <Input
                label="Max length"
                type="number"
                value={field.validation?.maxLength ?? ''}
                onChange={(e) => updateField(field.id, {
                  validation: { ...field.validation, maxLength: e.target.value === '' ? undefined : Number(e.target.value) },
                })}
              />
            </div>
          </div>
        )}

        {field.type === 'RATING' && (
          <div className="space-y-3 rounded-lg bg-gray-50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rating settings</h3>
            <Select
              label="Style"
              value={field.options?.ratingType ?? 'stars'}
              onChange={(e) => updateField(field.id, { options: { ...field.options, ratingType: e.target.value as 'stars' | 'hearts' | 'thumbs' } })}
              options={[
                { value: 'stars', label: 'Stars' },
                { value: 'hearts', label: 'Hearts' },
                { value: 'thumbs', label: 'Thumbs' },
              ]}
            />
            <Input
              label="Max"
              type="number"
              min={3}
              max={10}
              value={field.options?.ratingMax ?? 5}
              onChange={(e) => updateField(field.id, { options: { ...field.options, ratingMax: Number(e.target.value) } })}
            />
          </div>
        )}

        {hasChoices && (
          <ChoiceEditor field={field} onUpdate={(opts) => updateField(field.id, { options: { ...field.options, choices: opts } })} />
        )}
      </div>
    </aside>
  );
}

interface ChoiceEditorProps {
  field: FormField;
  onUpdate: (options: FieldOption[]) => void;
}

function ChoiceEditor({ field, onUpdate }: ChoiceEditorProps): JSX.Element {
  const choices = field.options?.choices ?? [];

  function setLabel(index: number, label: string): void {
    const next = choices.slice();
    const current = next[index];
    if (!current) return;
    next[index] = { ...current, label, value: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || current.value };
    onUpdate(next);
  }

  function remove(index: number): void {
    const next = choices.slice();
    next.splice(index, 1);
    onUpdate(next);
  }

  return (
    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Choices</h3>
      <div className="space-y-2">
        {choices.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <input
              type="text"
              value={c.label}
              onChange={(e) => setLabel(i, e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              maxLength={200}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove choice"
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              disabled={choices.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        fullWidth
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={() => onUpdate([...choices, newOption()])}
      >
        Add choice
      </Button>
    </div>
  );
}
