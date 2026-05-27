/**
 * API key service. Raw key shown ONCE on creation, never retrievable again.
 */
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { apiKeys } from '../../../drizzle/schema/apiKeys';
import { generateApiKey, encryptApiKey, decryptApiKey } from '../../lib/apiKey';
import { PLAN_LIMITS } from '../../lib/constants';
import { NotFoundError, PaymentRequiredError, ForbiddenError, ConflictError } from '../../lib/AppError';
import { recordAudit } from '../../lib/auditLog';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  canReveal: boolean;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface CreatedApiKey extends ApiKeyListItem {
  rawKey: string;
}

export const apiKeysService = {
  async list(user: AuthenticatedUser): Promise<ApiKeyListItem[]> {
    const rows = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        encryptedKey: apiKeys.encryptedKey,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)))
      .orderBy(apiKeys.createdAt);

    return rows.map(({ encryptedKey, ...row }) => ({ ...row, canReveal: Boolean(encryptedKey) }));
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
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      canReveal: true,
      scopes: created.scopes,
      lastUsedAt: created.lastUsedAt,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
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
      throw new ConflictError(
        'This API key was created before reveal support and cannot be shown. Please generate a new key.',
        'API_KEY_NOT_REVEALABLE',
      );
    }

    try {
      return decryptApiKey(row.encryptedKey);
    } catch {
      throw new ConflictError('This API key cannot be revealed. Please revoke it and generate a new key.', 'API_KEY_NOT_REVEALABLE');
    }
  },
};
