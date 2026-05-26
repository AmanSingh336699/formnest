import { pgTable, text, pgEnum, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users, userPlanEnum } from './users';

export const teamRoleEnum = pgEnum('team_role', ['OWNER', 'MEMBER']);
export const memberStatusEnum = pgEnum('member_status', ['INVITED', 'ACTIVE', 'REMOVED']);

export const teams = pgTable(
  'teams',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    name: text('name').notNull(),
    ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    plan: userPlanEnum('plan').notNull().default('FREE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index('teams_owner_idx').on(table.ownerId),
  }),
);

export const teamMembers = pgTable(
  'team_members',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    invitedEmail: text('invited_email'), // populated until user accepts
    role: teamRoleEnum('role').notNull().default('MEMBER'),
    invitedBy: text('invited_by').references(() => users.id, { onDelete: 'set null' }),
    inviteTokenHash: text('invite_token_hash'),
    inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    status: memberStatusEnum('status').notNull().default('INVITED'),
  },
  (table) => ({
    teamUserUnique: uniqueIndex('team_members_team_user_unique').on(table.teamId, table.userId),
    teamIdx: index('team_members_team_idx').on(table.teamId),
    userIdx: index('team_members_user_idx').on(table.userId),
    inviteTokenIdx: index('team_members_invite_token_idx').on(table.inviteTokenHash),
  }),
);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type TeamRole = (typeof teamRoleEnum.enumValues)[number];
export type MemberStatus = (typeof memberStatusEnum.enumValues)[number];
