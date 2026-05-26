/**
 * Teams service. Single team per user MVP. Email-based invitations.
 */
import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from '../../config/database';
import { teams, teamMembers, type Team, type TeamMember } from '../../../drizzle/schema/teams';
import { users } from '../../../drizzle/schema/users';
import { emailQueue } from '../../config/queue';
import { env } from '../../config/env';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../../lib/AppError';
import { generateOpaqueToken, hashOpaqueToken } from '../../lib/tokens';
import { TOKEN_TTL } from '../../lib/constants';
import { recordAudit } from '../../lib/auditLog';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';

export const teamsService = {
  async listForUser(userId: string): Promise<Team[]> {
    const memberships = await db
      .select({ team: teams })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.status, 'ACTIVE')));
    return memberships.map((m) => m.team);
  },

  async create(user: AuthenticatedUser, name: string, ctx: { ip: string | null; ua: string | null }): Promise<Team> {
    const result = await db.transaction(async (tx) => {
      const [team] = await tx
        .insert(teams)
        .values({ name, ownerId: user.id, plan: user.plan })
        .returning();
      if (!team) throw new Error('Failed to create team');

      await tx.insert(teamMembers).values({
        teamId: team.id,
        userId: user.id,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
      return team;
    });

    await recordAudit({
      userId: user.id,
      entityType: 'team',
      entityId: result.id,
      action: 'CREATE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return result;
  },

  async getMembers(user: AuthenticatedUser, teamId: string): Promise<Array<TeamMember & { email: string | null; name: string | null }>> {
    await this.assertOwnerOrMember(user.id, teamId);

    const rows = await db
      .select({
        member: teamMembers,
        userEmail: users.email,
        userName: users.name,
      })
      .from(teamMembers)
      .leftJoin(users, eq(users.id, teamMembers.userId))
      .where(eq(teamMembers.teamId, teamId));

    return rows.map((r) => ({
      ...r.member,
      email: r.userEmail ?? r.member.invitedEmail,
      name: r.userName,
    }));
  },

  async invite(
    user: AuthenticatedUser,
    teamId: string,
    inviteeEmail: string,
    ctx: { ip: string | null; ua: string | null },
  ): Promise<TeamMember> {
    await this.assertOwner(user.id, teamId);

    const email = inviteeEmail.toLowerCase().trim();
    if (email === user.email.toLowerCase()) {
      throw new ValidationError('You cannot invite yourself');
    }

    // Check existing invite/member
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser) {
      const [dupe] = await db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, existingUser.id)))
        .limit(1);
      if (dupe && dupe.status !== 'REMOVED') {
        throw new ConflictError('That user is already a member of this team');
      }
    }

    const token = generateOpaqueToken(32);
    const expiresAt = new Date(Date.now() + TOKEN_TTL.TEAM_INVITE_SEC * 1000);

    const [created] = await db
      .insert(teamMembers)
      .values({
        teamId,
        userId: existingUser?.id ?? null,
        invitedEmail: email,
        role: 'MEMBER',
        status: 'INVITED',
        invitedBy: user.id,
        inviteTokenHash: token.hash,
        inviteExpiresAt: expiresAt,
      })
      .returning();
    if (!created) throw new Error('Failed to create invitation');

    const acceptUrl = `${env.FRONTEND_URL}/teams/accept?token=${token.raw}`;
    await emailQueue.add('team-invite', {
      to: email,
      subject: `You're invited to join a team on FormNest`,
      template: 'teamInvite',
      variables: { inviterName: user.name, acceptUrl },
    });

    await recordAudit({
      userId: user.id,
      entityType: 'team',
      entityId: teamId,
      action: 'INVITE',
      diff: { email },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return created;
  },

  async acceptInvitation(user: AuthenticatedUser, rawToken: string): Promise<{ teamId: string }> {
    const tokenHash = hashOpaqueToken(rawToken);
    const [row] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.inviteTokenHash, tokenHash), eq(teamMembers.status, 'INVITED')))
      .limit(1);

    if (!row) throw new ValidationError('Invalid or expired invitation');
    if (row.inviteExpiresAt && row.inviteExpiresAt < new Date()) {
      throw new ValidationError('This invitation has expired');
    }
    if (row.invitedEmail && row.invitedEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError('This invitation is not for your account');
    }

    await db
      .update(teamMembers)
      .set({
        userId: user.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
        inviteTokenHash: null,
        inviteExpiresAt: null,
      })
      .where(eq(teamMembers.id, row.id));

    return { teamId: row.teamId };
  },

  async removeMember(
    user: AuthenticatedUser,
    teamId: string,
    targetUserId: string,
    ctx: { ip: string | null; ua: string | null },
  ): Promise<void> {
    await this.assertOwner(user.id, teamId);
    if (targetUserId === user.id) throw new ValidationError('Owners cannot remove themselves');

    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)))
      .limit(1);
    if (!member) throw new NotFoundError('Member not found');

    await db
      .update(teamMembers)
      .set({ status: 'REMOVED' })
      .where(eq(teamMembers.id, member.id));

    await recordAudit({
      userId: user.id,
      entityType: 'team_member',
      entityId: member.id,
      action: 'REMOVE_MEMBER',
      diff: { targetUserId },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async assertOwner(userId: string, teamId: string): Promise<void> {
    const [row] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (!row || row.role !== 'OWNER') {
      throw new ForbiddenError('Only team owners can perform this action');
    }
  },

  async assertOwnerOrMember(userId: string, teamId: string): Promise<void> {
    const [row] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (!row) throw new ForbiddenError('You are not a member of this team');
  },
};

// suppress unused
void or;
void isNull;
