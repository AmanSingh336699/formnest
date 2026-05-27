import type { FormField, FieldVisibilityRule } from '../types';

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left)) return left.includes(String(right));
  return String(left) === String(right);
}

function matchesRule(rule: FieldVisibilityRule, answers: Record<string, unknown>): boolean {
  const value = answers[rule.fieldId];

  switch (rule.operator) {
    case 'equals':
      return valuesEqual(value, rule.value);
    case 'notEquals':
      return !valuesEqual(value, rule.value);
    case 'contains':
      return Array.isArray(value)
        ? value.includes(String(rule.value))
        : typeof value === 'string' && typeof rule.value === 'string' && value.includes(rule.value);
    case 'notEmpty':
      return !isEmpty(value);
    case 'empty':
      return isEmpty(value);
    default:
      return true;
  }
}

export function isFieldVisible(field: FormField, answers: Record<string, unknown>): boolean {
  const visibility = field.options?.visibility;
  const rules = visibility?.rules?.filter((rule) => rule.fieldId && rule.operator) ?? [];
  if (rules.length === 0) return true;

  const results = rules.map((rule) => matchesRule(rule, answers));
  return visibility?.mode === 'any' ? results.some(Boolean) : results.every(Boolean);
}

export function getVisibleFields(fields: FormField[], answers: Record<string, unknown>): FormField[] {
  return fields.filter((field) => isFieldVisible(field, answers));
}

export function getDefaultAnswers(fields: FormField[]): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    if (field.options && Object.prototype.hasOwnProperty.call(field.options, 'defaultValue')) {
      const value = field.options.defaultValue;
      if (value !== undefined && value !== null && value !== '') acc[field.id] = value;
    }
    return acc;
  }, {});
}
