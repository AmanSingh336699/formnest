import { useBuilderStore } from '../../store/builderStore';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Trash2, Plus } from 'lucide-react';
import type { FieldConditionOperator, FieldOption, FieldVisibilityRule, FormField } from '../../types';

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
  const supportsDefaultValue = isInput && field.type !== 'CHECKBOX' && field.type !== 'RATING';

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

        {supportsDefaultValue && (
          <DefaultValueEditor field={field} onUpdate={(defaultValue) => updateField(field.id, { options: { ...field.options, defaultValue } })} />
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

        {(field.type === 'TEXT_SHORT' || field.type === 'TEXT_LONG' || field.type === 'PASSWORD') && (
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

        {isInput && (
          <VisibilityRulesEditor
            field={field}
            fields={fields}
            onUpdate={(visibility) => updateField(field.id, { options: { ...field.options, visibility } })}
          />
        )}
      </div>
    </aside>
  );
}

interface DefaultValueEditorProps {
  field: FormField;
  onUpdate: (value: string | number | boolean | null) => void;
}

function DefaultValueEditor({ field, onUpdate }: DefaultValueEditorProps): JSX.Element {
  if (field.type === 'RADIO' || field.type === 'DROPDOWN') {
    return (
      <Select
        label="Default value"
        value={field.options?.defaultValue === undefined || field.options.defaultValue === null ? '' : String(field.options.defaultValue)}
        onChange={(e) => onUpdate(e.target.value || null)}
        options={[
          { value: '', label: 'No default' },
          ...(field.options?.choices ?? []).map((choice) => ({ value: choice.value, label: choice.label })),
        ]}
      />
    );
  }

  if (field.type === 'YES_NO') {
    return (
      <Select
        label="Default value"
        value={field.options?.defaultValue === true ? 'true' : field.options?.defaultValue === false ? 'false' : ''}
        onChange={(e) => onUpdate(e.target.value === '' ? null : e.target.value === 'true')}
        options={[
          { value: '', label: 'No default' },
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]}
      />
    );
  }

  if (field.type === 'NUMBER') {
    return (
      <Input
        label="Default value"
        type="number"
        value={field.options?.defaultValue === undefined || field.options.defaultValue === null ? '' : String(field.options.defaultValue)}
        onChange={(e) => onUpdate(e.target.value === '' ? null : Number(e.target.value))}
      />
    );
  }

  return (
    <Input
      label="Default value"
      type={field.type === 'DATE' ? 'date' : 'text'}
      value={field.options?.defaultValue === undefined || field.options.defaultValue === null ? '' : String(field.options.defaultValue)}
      onChange={(e) => onUpdate(e.target.value || null)}
      maxLength={500}
    />
  );
}

interface ChoiceEditorProps {
  field: FormField;
  onUpdate: (options: FieldOption[]) => void;
}

interface VisibilityRulesEditorProps {
  field: FormField;
  fields: FormField[];
  onUpdate: (visibility: NonNullable<FormField['options']>['visibility']) => void;
}

const conditionOperators: Array<{ value: FieldConditionOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'notEmpty', label: 'Is filled' },
  { value: 'empty', label: 'Is empty' },
];

function VisibilityRulesEditor({ field, fields, onUpdate }: VisibilityRulesEditorProps): JSX.Element {
  const availableFields = fields.filter((f) => f.id !== field.id && f.type !== 'HEADING' && f.type !== 'DIVIDER');
  const visibility = field.options?.visibility ?? null;
  const rules = visibility?.rules ?? [];
  const hasRules = rules.length > 0;

  function updateRule(index: number, patch: Partial<FieldVisibilityRule>): void {
    const next = rules.slice();
    const current = next[index];
    if (!current) return;
    next[index] = { ...current, ...patch };
    onUpdate({ mode: visibility?.mode ?? 'all', rules: next });
  }

  function addRule(): void {
    const firstField = availableFields[0];
    if (!firstField) return;
    onUpdate({
      mode: visibility?.mode ?? 'all',
      rules: [...rules, { fieldId: firstField.id, operator: 'equals', value: '' }],
    });
  }

  function removeRule(index: number): void {
    const next = rules.slice();
    next.splice(index, 1);
    onUpdate(next.length > 0 ? { mode: visibility?.mode ?? 'all', rules: next } : null);
  }

  return (
    <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-800/70">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Conditional visibility</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Show this field only when selected conditions match.</p>
      </div>

      {availableFields.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-slate-400">Add another input field before configuring conditions.</p>
      ) : (
        <>
          {hasRules && (
            <Select
              label="Match"
              value={visibility?.mode ?? 'all'}
              onChange={(e) => onUpdate({ mode: e.target.value as 'all' | 'any', rules })}
              options={[
                { value: 'all', label: 'All conditions' },
                { value: 'any', label: 'Any condition' },
              ]}
            />
          )}

          <div className="space-y-2">
            {rules.map((rule, index) => {
              const selectedOperator = rule.operator;
              const needsValue = selectedOperator !== 'empty' && selectedOperator !== 'notEmpty';

              return (
                <div key={`${rule.fieldId}-${index}`} className="space-y-2 rounded-md border border-gray-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                  <Select
                    label="Field"
                    value={rule.fieldId}
                    onChange={(e) => updateRule(index, { fieldId: e.target.value })}
                    options={availableFields.map((f) => ({ value: f.id, label: f.label || f.type.toLowerCase().replace('_', ' ') }))}
                  />
                  <Select
                    label="Condition"
                    value={selectedOperator}
                    onChange={(e) => updateRule(index, { operator: e.target.value as FieldConditionOperator, value: '' })}
                    options={conditionOperators}
                  />
                  {needsValue && (
                    <Input
                      label="Value"
                      value={rule.value === undefined || rule.value === null ? '' : String(rule.value)}
                      onChange={(e) => updateRule(index, { value: e.target.value })}
                      maxLength={200}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove condition
                  </button>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="outline" size="sm" fullWidth leftIcon={<Plus className="h-4 w-4" />} onClick={addRule}>
            Add condition
          </Button>
        </>
      )}
    </div>
  );
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
