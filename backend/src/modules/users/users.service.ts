import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { users, type User } from '../../../drizzle/schema/users';
import { forms } from '../../../drizzle/schema/forms';
import { responses } from '../../../drizzle/schema/responses';
import { authService } from '../auth/auth.service';
import { recordAudit } from '../../lib/auditLog';
import { NotFoundError } from '../../lib/AppError';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';

export const usersService = {
  async me(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');
    const { passwordHash: _ph, ...rest } = user;
    void _ph;
    return rest;
  },

  async updateProfile(
    userId: string,
    body: { name?: string; locale?: string; timezone?: string; avatarUrl?: string | null },
  ): Promise<Omit<User, 'passwordHash'>> {
    const update: Partial<User> = { updatedAt: new Date() };
    if (body.name !== undefined) update.name = body.name;
    if (body.locale !== undefined) update.locale = body.locale;
    if (body.timezone !== undefined) update.timezone = body.timezone;
    if (body.avatarUrl !== undefined) update.avatarUrl = body.avatarUrl;

    const [updated] = await db.update(users).set(update).where(eq(users.id, userId)).returning();
    if (!updated) throw new NotFoundError('User not found');
    const { passwordHash: _ph, ...rest } = updated;
    void _ph;
    return rest;
  },

  async changePassword(userId: string, current: string, next: string, ctx: { ip: string | null; ua: string | null }): Promise<void> {
    await authService.changePassword(userId, current, next);
    await recordAudit({
      userId,
      entityType: 'user',
      entityId: userId,
      action: 'PASSWORD_CHANGE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async exportData(userId: string): Promise<Record<string, unknown>> {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    const userForms = await db.select().from(forms).where(eq(forms.userId, userId));
    const allResponses = await db
      .select()
      .from(responses)
      .where(eq(responses.submitterUserId, userId));

    const { passwordHash: _ph, ...userSafe } = user;
    void _ph;
    return {
      exportedAt: new Date().toISOString(),
      user: userSafe,
      forms: userForms,
      responsesAsSubmitter: allResponses,
    };
  },

  async deleteAccount(user: AuthenticatedUser, ctx: { ip: string | null; ua: string | null }): Promise<void> {
    // CASCADE handles forms, responses, api keys, webhooks, refresh tokens, etc.
    await db.delete(users).where(eq(users.id, user.id));
    await recordAudit({
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'DELETE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },
};
