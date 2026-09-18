import {
  pgTable,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';
import { forms, formFields, fieldTypeEnum } from './forms';

export const responses = pgTable(
  'responses',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    formId: text('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    submitterUserId: text('submitter_user_id').references(() => users.id, { onDelete: 'set null' }),
    submitterIpHash: text('submitter_ip_hash'), // sha256 of anonymized IP
    userAgent: text('user_agent'),
    referrer: text('referrer'),
    completionTimeMs: integer('completion_time_ms'),
    isSpam: boolean('is_spam').notNull().default(false),
    spamReason: text('spam_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formCreatedIdx: index('responses_form_created_idx').on(table.formId, table.createdAt),
    formSpamIdx: index('responses_form_spam_idx').on(table.formId, table.isSpam),
  }),
);

export const responseAnswers = pgTable(
  'response_answers',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    responseId: text('response_id').notNull().references(() => responses.id, { onDelete: 'cascade' }),
    fieldId: text('field_id').notNull().references(() => formFields.id, { onDelete: 'cascade' }),
    fieldType: fieldTypeEnum('field_type').notNull(), // denormalized for resilience
    value: jsonb('value'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    responseIdx: index('response_answers_response_idx').on(table.responseId),
    fieldIdx: index('response_answers_field_idx').on(table.fieldId),
  }),
);

export const fileUploads = pgTable(
  'file_uploads',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    responseId: text('response_id').references(() => responses.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    formId: text('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    publicId: text('s3_key').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    responseIdx: index('file_uploads_response_idx').on(table.responseId),
    formIdx: index('file_uploads_form_idx').on(table.formId),
    userIdx: index('file_uploads_user_idx').on(table.userId),
  }),
);

export type Response = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;
export type ResponseAnswer = typeof responseAnswers.$inferSelect;
export type NewResponseAnswer = typeof responseAnswers.$inferInsert;
export type FileUpload = typeof fileUploads.$inferSelect;
export type NewFileUpload = typeof fileUploads.$inferInsert;
