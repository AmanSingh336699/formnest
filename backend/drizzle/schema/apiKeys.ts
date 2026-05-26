import { pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull(),
    encryptedKey: text('encrypted_key'), // stored for re-revealing using AES-256-GCM
    keyPrefix: text('key_prefix').notNull(), // first 8 chars for UI display only
    scopes: text('scopes').array().notNull().default([
      'forms:read',
      'forms:write',
      'responses:read',
      'responses:write',
      'webhooks:manage',
    ]),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastUsedIp: text('last_used_ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyHashIdx: uniqueIndex('api_keys_hash_idx').on(table.keyHash),
    userIdIdx: index('api_keys_user_idx').on(table.userId),
    prefixIdx: index('api_keys_prefix_idx').on(table.keyPrefix),
  }),
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
