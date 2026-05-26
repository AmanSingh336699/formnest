import { pgTable, text, pgEnum, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const userPlanEnum = pgEnum('user_plan', ['FREE', 'PRO', 'ENTERPRISE']);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    avatarUrl: text('avatar_url'),
    plan: userPlanEnum('plan').notNull().default('FREE'),
    planValidUntil: timestamp('plan_valid_until', { withTimezone: true }),
    stripeCustomerId: text('stripe_customer_id'),
    emailVerified: boolean('email_verified').notNull().default(false),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastLoginIp: text('last_login_ip'), // pre-anonymized
    locale: text('locale').notNull().default('en'),
    timezone: text('timezone').notNull().default('UTC'),
    isSuspended: boolean('is_suspended').notNull().default(false),
    suspendedReason: text('suspended_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    stripeCustomerIdx: index('users_stripe_customer_idx').on(table.stripeCustomerId),
  }),
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('email_verification_tokens_hash_idx').on(table.tokenHash),
    userIdIdx: index('email_verification_tokens_user_idx').on(table.userId),
  }),
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('password_reset_tokens_hash_idx').on(table.tokenHash),
    userIdIdx: index('password_reset_tokens_user_idx').on(table.userId),
  }),
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('refresh_tokens_hash_idx').on(table.tokenHash),
    userIdIdx: index('refresh_tokens_user_idx').on(table.userId),
    expiresAtIdx: index('refresh_tokens_expires_idx').on(table.expiresAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserPlan = (typeof userPlanEnum.enumValues)[number];
