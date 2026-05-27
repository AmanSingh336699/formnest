/**
 * Form builder edit state. Independent of TanStack Query — represents work-in-progress.
 * Auto-save subscribes to changes and POSTs every 2s of inactivity.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Form, FormField, FormTheme, FormSettings, FieldType, FieldOption } from '../types';

interface BuilderState {
  formId: string | null;
  title: string;
  description: string | null;
  fields: FormField[];
  theme: FormTheme;
  settings: FormSettings;
  selectedFieldId: string | null;
  isDirty: boolean;
  lastSavedAt: number | null;
  isSaving: boolean;

  loadForm: (form: Form) => void;
  setTitle: (title: string) => void;
  setDescription: (description: string | null) => void;
  addField: (type: FieldType, position?: number) => string;
  updateField: (id: string, patch: Partial<FormField>) => void;
  removeField: (id: string) => void;
  moveField: (fromIndex: number, toIndex: number) => void;
  duplicateField: (id: string) => void;
  selectField: (id: string | null) => void;
  setTheme: (theme: Partial<FormTheme>) => void;
  setSettings: (settings: Partial<FormSettings>) => void;
  markClean: () => void;
  markSaving: (saving: boolean) => void;
  reset: () => void;
}

function genTempId(): string {
  return `field_${Math.random().toString(36).slice(2, 10)}`;
}

function genOptionId(): string {
  return `opt_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultFieldFor(type: FieldType, position: number): FormField {
  const base: FormField = {
    id: genTempId(),
    type,
    label: defaultLabel(type),
    placeholder: null,
    helpText: null,
    required: false,
    position,
    validation: null,
    options: null,
  };
  if (type === 'RADIO' || type === 'CHECKBOX' || type === 'DROPDOWN') {
    const opts: FieldOption[] = [
      { id: genOptionId(), label: 'Option 1', value: 'option-1' },
      { id: genOptionId(), label: 'Option 2', value: 'option-2' },
    ];
    base.options = { choices: opts };
  }
  if (type === 'RATING') {
    base.options = { ratingType: 'stars', ratingMax: 5 };
  }
  return base;
}

function defaultLabel(type: FieldType): string {
  const map: Record<FieldType, string> = {
    TEXT_SHORT: 'Short answer',
    TEXT_LONG: 'Long answer',
    PASSWORD: 'Password',
    EMAIL: 'Email',
    NUMBER: 'Number',
    PHONE: 'Phone',
    RADIO: 'Choose one',
    CHECKBOX: 'Choose multiple',
    DROPDOWN: 'Select from list',
    DATE: 'Date',
    RATING: 'Rating',
    YES_NO: 'Yes / No',
    HEADING: 'Section heading',
    DIVIDER: '',
  };
  return map[type];
}

export const useBuilderStore = create<BuilderState>()(
  immer((set) => ({
    formId: null,
    title: '',
    description: null,
    fields: [],
    theme: { preset: 'clean' },
    settings: {},
    selectedFieldId: null,
    isDirty: false,
    lastSavedAt: null,
    isSaving: false,

    loadForm: (form) =>
      set((s) => {
        s.formId = form.id;
        s.title = form.title;
        s.description = form.description;
        s.fields = form.fields.slice().sort((a, b) => a.position - b.position);
        s.theme = form.theme ?? { preset: 'clean' };
        s.settings = form.settings ?? {};
        s.isDirty = false;
        s.lastSavedAt = Date.now();
      }),

    setTitle: (title) =>
      set((s) => {
        s.title = title;
        s.isDirty = true;
      }),

    setDescription: (description) =>
      set((s) => {
        s.description = description;
        s.isDirty = true;
      }),

    addField: (type, position) => {
      const newId = genTempId();
      set((s) => {
        const pos = position ?? s.fields.length;
        const field = { ...defaultFieldFor(type, pos), id: newId };
        s.fields.splice(pos, 0, field);
        s.fields.forEach((f, i) => { f.position = i; });
        s.selectedFieldId = newId;
        s.isDirty = true;
      });
      return newId;
    },

    updateField: (id, patch) =>
      set((s) => {
        const idx = s.fields.findIndex((f) => f.id === id);
        if (idx === -1) return;
        s.fields[idx] = { ...s.fields[idx], ...patch } as FormField;
        s.isDirty = true;
      }),

    removeField: (id) =>
      set((s) => {
        s.fields = s.fields.filter((f) => f.id !== id);
        s.fields.forEach((f, i) => { f.position = i; });
        if (s.selectedFieldId === id) s.selectedFieldId = null;
        s.isDirty = true;
      }),

    moveField: (fromIndex, toIndex) =>
      set((s) => {
        if (fromIndex === toIndex) return;
        const [moved] = s.fields.splice(fromIndex, 1);
        if (!moved) return;
        s.fields.splice(toIndex, 0, moved);
        s.fields.forEach((f, i) => { f.position = i; });
        s.isDirty = true;
      }),

    duplicateField: (id) =>
      set((s) => {
        const idx = s.fields.findIndex((f) => f.id === id);
        if (idx === -1) return;
        const original = s.fields[idx];
        if (!original) return;
        const copy: FormField = { ...original, id: genTempId(), label: `${original.label} (copy)` };
        s.fields.splice(idx + 1, 0, copy);
        s.fields.forEach((f, i) => { f.position = i; });
        s.selectedFieldId = copy.id;
        s.isDirty = true;
      }),

    selectField: (id) =>
      set((s) => {
        s.selectedFieldId = id;
      }),

    setTheme: (theme) =>
      set((s) => {
        s.theme = { ...s.theme, ...theme };
        s.isDirty = true;
      }),

    setSettings: (settings) =>
      set((s) => {
        s.settings = { ...s.settings, ...settings };
        s.isDirty = true;
      }),

    markClean: () =>
      set((s) => {
        s.isDirty = false;
        s.lastSavedAt = Date.now();
      }),

    markSaving: (saving) =>
      set((s) => {
        s.isSaving = saving;
      }),

    reset: () =>
      set((s) => {
        s.formId = null;
        s.title = '';
        s.description = null;
        s.fields = [];
        s.theme = { preset: 'clean' };
        s.settings = {};
        s.selectedFieldId = null;
        s.isDirty = false;
        s.lastSavedAt = null;
        s.isSaving = false;
      }),
  })),
);
