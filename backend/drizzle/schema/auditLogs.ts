import { pgTable, text, pgEnum, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';

export const auditActionEnum = pgEnum('audit_action', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'PUBLISH',
  'UNPUBLISH',
  'CLOSE',
  'ARCHIVE',
  'DUPLICATE',
  'INVITE',
  'REMOVE_MEMBER',
  'LOGIN',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'KEY_CREATE',
  'KEY_REVOKE',
  'WEBHOOK_TEST',
  'EXPORT',
]);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    action: auditActionEnum('action').notNull(),
    diff: jsonb('diff'),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index('audit_logs_user_created_idx').on(table.userId, table.createdAt),
    entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction = (typeof auditActionEnum.enumValues)[number];
