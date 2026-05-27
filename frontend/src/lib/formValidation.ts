/**
 * Client-side validation matching backend rules. Identical errors → consistent UX.
 */
import type { FormField } from '../types';
import { getVisibleFields } from './fieldVisibility';

export type ValidationErrors = Record<string, string>;

export interface ValidationResult {
  ok: boolean;
  errors: ValidationErrors;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function validateAnswers(fields: FormField[], answers: Record<string, unknown>): ValidationResult {
  const errors: ValidationErrors = {};

  for (const field of getVisibleFields(fields, answers)) {
    if (field.type === 'HEADING' || field.type === 'DIVIDER') continue;
    const value = answers[field.id];

    if (field.required && isEmpty(value)) {
      errors[field.id] = `${field.label} is required`;
      continue;
    }
    if (isEmpty(value)) continue;

    const v = field.validation;

    if (field.type === 'EMAIL' && typeof value === 'string') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.id] = v?.customError ?? 'Please enter a valid email address';
      }
    } else if ((field.type === 'TEXT_SHORT' || field.type === 'TEXT_LONG' || field.type === 'PASSWORD') && typeof value === 'string') {
      if (v?.minLength && value.length < v.minLength) {
        errors[field.id] = v.customError ?? `Minimum ${v.minLength} characters required`;
      } else if (v?.maxLength && value.length > v.maxLength) {
        errors[field.id] = v.customError ?? `Maximum ${v.maxLength} characters allowed`;
      } else if (v?.regex) {
        try {
          if (!new RegExp(v.regex).test(value)) {
            errors[field.id] = v.customError ?? 'Invalid format';
          }
        } catch {
          // ignore bad regex
        }
      }
    } else if (field.type === 'NUMBER' && typeof value === 'number') {
      if (v?.min !== undefined && value < v.min) {
        errors[field.id] = v.customError ?? `Must be ≥ ${v.min}`;
      } else if (v?.max !== undefined && value > v.max) {
        errors[field.id] = v.customError ?? `Must be ≤ ${v.max}`;
      } else if (v?.integerOnly && !Number.isInteger(value)) {
        errors[field.id] = v.customError ?? 'Must be a whole number';
      }
    } else if (field.type === 'PHONE' && typeof value === 'string') {
      // Lenient — server does strict validation via libphonenumber
      if (!/^[+0-9\s()\-]{5,20}$/.test(value)) {
        errors[field.id] = v?.customError ?? 'Please enter a valid phone number';
      }
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
