import {
  pgTable,
  text,
  pgEnum,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';
import { forms } from './forms';
import { responses } from './responses';

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'PENDING',
  'SUCCESS',
  'FAILED',
  'DEAD',
]);

export const webhooks = pgTable(
  'webhooks',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    formId: text('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    secretEncrypted: text('secret_encrypted').notNull(),
    events: text('events').array().notNull().default(['response.created']),
    isActive: boolean('is_active').notNull().default(true),
    failureCount: integer('failure_count').notNull().default(0),
    lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
    lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
    autoDisabledAt: timestamp('auto_disabled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formIdx: index('webhooks_form_idx').on(table.formId),
    userIdx: index('webhooks_user_idx').on(table.userId),
    activeIdx: index('webhooks_active_idx').on(table.isActive),
  }),
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    webhookId: text('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
    responseId: text('response_id').references(() => responses.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    httpStatus: integer('http_status'),
    responseBody: text('response_body'), // truncated to 8KB
    durationMs: integer('duration_ms'),
    attempt: integer('attempt').notNull().default(1),
    status: deliveryStatusEnum('status').notNull().default('PENDING'),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    webhookCreatedIdx: index('webhook_deliveries_webhook_created_idx').on(
      table.webhookId,
      table.createdAt,
    ),
    statusIdx: index('webhook_deliveries_status_idx').on(table.status),
    nextRetryIdx: index('webhook_deliveries_next_retry_idx').on(table.nextRetryAt),
  }),
);

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
export type DeliveryStatus = (typeof deliveryStatusEnum.enumValues)[number];
