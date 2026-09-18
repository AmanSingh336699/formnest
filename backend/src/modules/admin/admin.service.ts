import { eq, and, or, ilike, desc, sql, gte, lte, isNull } from 'drizzle-orm';
import { db } from '../../config/database';
import { users } from '../../../drizzle/schema/users';
import { forms } from '../../../drizzle/schema/forms';
import { responses } from '../../../drizzle/schema/responses';
import { refreshTokens } from '../../../drizzle/schema/users';
import { recordAudit } from '../../lib/auditLog';
import { NotFoundError } from '../../lib/AppError';
import { authService } from '../auth/auth.service';

export const adminService = {
  async getDashboardStats() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      [totalUsersRes],
      [verifiedUsersRes],
      [unverifiedUsersRes],
      [suspendedUsersRes],
      planCounts,
      [totalFormsRes],
      [totalResponsesRes],
      recentSignups
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.emailVerified, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.emailVerified, false)),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.isSuspended, true)),
      db.select({ plan: users.plan, count: sql<number>`count(*)::int` }).from(users).groupBy(users.plan),
      db.select({ count: sql<number>`count(*)::int` }).from(forms),
      db.select({ count: sql<number>`count(*)::int` }).from(responses),
      db.select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt, plan: users.plan })
        .from(users)
        .where(gte(users.createdAt, sevenDaysAgo))
        .orderBy(desc(users.createdAt))
        .limit(10)
    ]);

    const plans = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    planCounts.forEach((row) => {
      if (row.plan === 'FREE' || row.plan === 'PRO' || row.plan === 'ENTERPRISE') {
        plans[row.plan] = row.count;
      }
    });

    return {
      totalUsers: totalUsersRes?.count ?? 0,
      verifiedUsers: verifiedUsersRes?.count ?? 0,
      unverifiedUsers: unverifiedUsersRes?.count ?? 0,
      suspendedUsers: suspendedUsersRes?.count ?? 0,
      plans,
      totalForms: totalFormsRes?.count ?? 0,
      totalResponses: totalResponsesRes?.count ?? 0,
      recentSignups
    };
  },

  async listUsers(params: {
    search?: string;
    page: number;
    limit: number;
    plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
    verified?: boolean;
    suspended?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const conditions = [];
    if (params.search) {
      const term = `%${params.search}%`;
      conditions.push(or(ilike(users.email, term), ilike(users.name, term)));
    }
    if (params.plan) {
      conditions.push(eq(users.plan, params.plan));
    }
    if (params.verified !== undefined) {
      conditions.push(eq(users.emailVerified, params.verified));
    }
    if (params.suspended !== undefined) {
      conditions.push(eq(users.isSuspended, params.suspended));
    }
    if (params.dateFrom) {
      conditions.push(gte(users.createdAt, new Date(params.dateFrom)));
    }
    if (params.dateTo) {
      conditions.push(lte(users.createdAt, new Date(params.dateTo)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.limit;

    const [selectItems, totalResult] = await Promise.all([
      db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(params.limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(where),
    ]);

    const items = selectItems.map(({ passwordHash, ...rest }) => rest);
    const total = totalResult[0]?.count ?? 0;
    return { items, total, page: params.page, limit: params.limit };
  },

  async getUserDetail(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');
    const { passwordHash, ...userSafe } = user;

    const [
      [formsCountRes],
      userForms,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(forms).where(eq(forms.userId, userId)),
      db.select().from(forms).where(eq(forms.userId, userId)).orderBy(desc(forms.createdAt)).limit(50),
    ]);

    return {
      user: userSafe,
      formsCount: formsCountRes?.count ?? 0,
      forms: userForms,
    };
  },

  async verifyEmail(adminId: string, userId: string, reason: string, ctx: { ip: string | null; ua: string | null }) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    await db.update(users).set({ emailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));

    await recordAudit({
      userId: adminId,
      entityType: 'user',
      entityId: userId,
      action: 'ADMIN_VERIFY_EMAIL',
      diff: { reason },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async unverifyEmail(adminId: string, userId: string, reason: string, ctx: { ip: string | null; ua: string | null }) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    await db.update(users).set({ emailVerified: false, emailVerifiedAt: null, updatedAt: new Date() }).where(eq(users.id, userId));

    await recordAudit({
      userId: adminId,
      entityType: 'user',
      entityId: userId,
      action: 'ADMIN_UNVERIFY_EMAIL',
      diff: { reason },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async resendVerification(adminId: string, userId: string, ctx: { ip: string | null; ua: string | null }) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    await authService.sendVerificationEmail(user.id, user.email, user.name);

    await recordAudit({
      userId: adminId,
      entityType: 'user',
      entityId: userId,
      action: 'ADMIN_RESEND_VERIFICATION',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async changePlan(
    adminId: string,
    userId: string,
    plan: 'FREE' | 'PRO' | 'ENTERPRISE',
    planValidUntil: string | null | undefined,
    reason: string,
    ctx: { ip: string | null; ua: string | null },
  ) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    const validUntilDate = planValidUntil ? new Date(planValidUntil) : null;
    await db.update(users).set({ plan, planValidUntil: validUntilDate, updatedAt: new Date() }).where(eq(users.id, userId));

    await recordAudit({
      userId: adminId,
      entityType: 'user',
      entityId: userId,
      action: 'ADMIN_CHANGE_PLAN',
      diff: { plan, planValidUntil, reason },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async suspendUser(adminId: string, userId: string, reason: string, ctx: { ip: string | null; ua: string | null }) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    await db.transaction(async (tx) => {
      await tx.update(users).set({ isSuspended: true, suspendedReason: reason, updatedAt: new Date() }).where(eq(users.id, userId));
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
    });

    await recordAudit({
      userId: adminId,
      entityType: 'user',
      entityId: userId,
      action: 'ADMIN_SUSPEND',
      diff: { reason },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async unsuspendUser(adminId: string, userId: string, reason: string, ctx: { ip: string | null; ua: string | null }) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    await db.update(users).set({ isSuspended: false, suspendedReason: null, updatedAt: new Date() }).where(eq(users.id, userId));

    await recordAudit({
      userId: adminId,
      entityType: 'user',
      entityId: userId,
      action: 'ADMIN_UNSUSPEND',
      diff: { reason },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async revokeAllSessions(adminId: string, userId: string, reason: string, ctx: { ip: string | null; ua: string | null }) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));

    await recordAudit({
      userId: adminId,
      entityType: 'user',
      entityId: userId,
      action: 'ADMIN_REVOKE_SESSIONS',
      diff: { reason },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async getUserForms(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [items, totalResult] = await Promise.all([
      db.select().from(forms).where(eq(forms.userId, userId)).orderBy(desc(forms.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(forms).where(eq(forms.userId, userId)),
    ]);
    const total = totalResult[0]?.count ?? 0;
    return { items, total, page, limit };
  },

  async listAllForms(params: { search?: string; page: number; limit: number }) {
    const offset = (params.page - 1) * params.limit;
    const conditions = [];
    if (params.search) {
      const term = `%${params.search}%`;
      conditions.push(or(ilike(forms.title, term), ilike(users.email, term)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select({
          id: forms.id,
          title: forms.title,
          slug: forms.slug,
          customSlug: forms.customSlug,
          status: forms.status,
          createdAt: forms.createdAt,
          userId: forms.userId,
          userEmail: users.email,
          userName: users.name,
        })
        .from(forms)
        .leftJoin(users, eq(forms.userId, users.id))
        .where(where)
        .orderBy(desc(forms.createdAt))
        .limit(params.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(forms)
        .leftJoin(users, eq(forms.userId, users.id))
        .where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;
    return { items, total, page: params.page, limit: params.limit };
  },
};
