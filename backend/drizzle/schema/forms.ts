import {
  pgTable,
  text,
  pgEnum,
  boolean,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';
import { teams } from './teams';

export const formStatusEnum = pgEnum('form_status', ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']);

export const fieldTypeEnum = pgEnum('field_type', [
  'TEXT_SHORT',
  'TEXT_LONG',
  'EMAIL',
  'NUMBER',
  'PHONE',
  'RADIO',
  'CHECKBOX',
  'DROPDOWN',
  'DATE',
  'RATING',
  'YES_NO',
  'HEADING',
  'DIVIDER',
]);

export const forms = pgTable(
  'forms',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    teamId: text('team_id').references(() => teams.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    slug: text('slug').notNull(),
    customSlug: text('custom_slug'),
    status: formStatusEnum('status').notNull().default('DRAFT'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    theme: jsonb('theme').$type<FormTheme>(),
    settings: jsonb('settings').$type<FormSettings>(),
    schemaVersion: integer('schema_version').notNull().default(1),
    totalResponses: integer('total_responses').notNull().default(0),
    totalViews: integer('total_views').notNull().default(0),
    totalStarts: integer('total_starts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('forms_slug_idx').on(table.slug),
    customSlugIdx: uniqueIndex('forms_custom_slug_idx').on(table.customSlug),
    userIdx: index('forms_user_idx').on(table.userId),
    teamIdx: index('forms_team_idx').on(table.teamId),
    statusIdx: index('forms_status_idx').on(table.status),
    createdAtIdx: index('forms_created_at_idx').on(table.createdAt),
  }),
);

export const formFields = pgTable(
  'form_fields',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    formId: text('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    type: fieldTypeEnum('type').notNull(),
    label: text('label').notNull(),
    placeholder: text('placeholder'),
    helpText: text('help_text'),
    required: boolean('required').notNull().default(false),
    position: integer('position').notNull(),
    validation: jsonb('validation').$type<FieldValidation>(),
    options: jsonb('options').$type<FieldOptions>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formIdx: index('form_fields_form_idx').on(table.formId),
    formPositionIdx: index('form_fields_form_position_idx').on(table.formId, table.position),
  }),
);

export interface FormTheme {
  preset?: 'clean' | 'bold' | 'minimal' | 'custom';
  backgroundColor?: string;
  textColor?: string;
  primaryColor?: string;
  buttonColor?: string;
  borderRadius?: 'sharp' | 'rounded' | 'pill';
  fontFamily?: 'Inter' | 'Roboto' | 'Poppins';
  logoUrl?: string;
}

export interface FormSettings {
  allowMultipleSubmissions?: boolean;
  showProgressBar?: boolean;
  redirectUrl?: string;
  successMessage?: string;
  closedMessage?: string;
  limitReachedMessage?: string;
  maxResponses?: number;
  notifyOnResponse?: boolean;
  notifyEmails?: string[];
  showBranding?: boolean;
  closeOnDate?: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  integerOnly?: boolean;
  regex?: string;
  customError?: string;
  minDate?: string;
  maxDate?: string;
}

export interface FieldOptions {
  choices?: Array<{ id: string; label: string; value: string }>;
  ratingType?: 'stars' | 'hearts' | 'thumbs';
  ratingMax?: number;
  defaultValue?: string | number | boolean | null;
  searchable?: boolean;
}

export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type FormField = typeof formFields.$inferSelect;
export type NewFormField = typeof formFields.$inferInsert;
export type FormStatus = (typeof formStatusEnum.enumValues)[number];
export type FieldType = (typeof fieldTypeEnum.enumValues)[number];
