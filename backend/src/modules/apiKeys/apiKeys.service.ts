/**
 * API key service. Raw key shown ONCE on creation, never retrievable again.
 */
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { apiKeys, type ApiKey } from '../../../drizzle/schema/apiKeys';
import { generateApiKey, encryptApiKey, decryptApiKey } from '../../lib/apiKey';
import { PLAN_LIMITS } from '../../lib/constants';
import { NotFoundError, PaymentRequiredError, ForbiddenError } from '../../lib/AppError';
import { recordAudit } from '../../lib/auditLog';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';

export interface CreatedApiKey extends Omit<ApiKey, 'keyHash'> {
  rawKey: string;
}

export const apiKeysService = {
  async list(user: AuthenticatedUser): Promise<Omit<ApiKey, 'keyHash'>[]> {
    const rows = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        lastUsedIp: apiKeys.lastUsedIp,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
        encryptedKey: apiKeys.encryptedKey,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)))
      .orderBy(apiKeys.createdAt);
    return rows;
  },

  async create(
    user: AuthenticatedUser,
    name: string,
    ctx: { ip: string | null; ua: string | null },
  ): Promise<CreatedApiKey> {
    const limit = PLAN_LIMITS[user.plan].maxApiKeys;
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)));
    const count = result[0]?.count ?? 0;
    if (count >= limit) {
      throw new PaymentRequiredError(
        `Your plan allows ${limit} API key(s). Upgrade for more.`,
        'API_KEY_LIMIT_REACHED',
      );
    }

    const { rawKey, keyHash, keyPrefix } = generateApiKey();
    const encryptedKey = encryptApiKey(rawKey);
    const [created] = await db
      .insert(apiKeys)
      .values({ userId: user.id, name, keyHash, keyPrefix, encryptedKey })
      .returning();
    if (!created) throw new Error('Failed to create API key');

    await recordAudit({
      userId: user.id,
      entityType: 'api_key',
      entityId: created.id,
      action: 'KEY_CREATE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return {
      ...created,
      rawKey,
    };
  },

  async revoke(user: AuthenticatedUser, id: string, ctx: { ip: string | null; ua: string | null }): Promise<void> {
    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
    if (!row) throw new NotFoundError('API key not found');
    if (row.userId !== user.id) throw new ForbiddenError();
    if (row.revokedAt) return;

    await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id));
    await recordAudit({
      userId: user.id,
      entityType: 'api_key',
      entityId: id,
      action: 'KEY_REVOKE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async reveal(user: AuthenticatedUser, id: string): Promise<string> {
    const [row] = await db
      .select({ encryptedKey: apiKeys.encryptedKey, userId: apiKeys.userId })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
      .limit(1);
    
    if (!row) throw new NotFoundError('API key not found');
    if (row.userId !== user.id) throw new ForbiddenError();
    if (!row.encryptedKey) {
      throw new Error('This API key was created before reveal support and cannot be shown. Please generate a new key.');
    }
    
    return decryptApiKey(row.encryptedKey);
  },
};
