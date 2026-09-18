import type { Request, Response, NextFunction } from 'express';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../config/database';
import { users, type UserPlan } from '../../drizzle/schema/users';
import { apiKeys } from '../../drizzle/schema/apiKeys';
import { verifyAccessToken } from '../lib/jwt';
import { hashApiKey } from '../lib/apiKey';
import { UnauthorizedError, ForbiddenError } from '../lib/AppError';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  emailVerified: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  sessionId?: string;       // present for JWT auth
  apiKeyId?: string;        // present for API key auth
  scopes?: string[];        // present for API key auth
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value.trim();
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearer(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    // API key path
    if (token.startsWith('fn_')) {
      const keyHash = hashApiKey(token);
      const [apiKey] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
        .limit(1);

      if (!apiKey) throw new UnauthorizedError('Invalid API key', 'TOKEN_INVALID');
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        throw new UnauthorizedError('API key expired', 'TOKEN_EXPIRED');
      }

      const [user] = await db.select().from(users).where(eq(users.id, apiKey.userId)).limit(1);
      if (!user) throw new UnauthorizedError('Owner of API key not found');
      if (user.isSuspended) throw new ForbiddenError('Account suspended', 'ACCOUNT_SUSPENDED');

      // Async update lastUsedAt (don't await — fire-and-forget)
      void db
        .update(apiKeys)
        .set({ lastUsedAt: new Date(), lastUsedIp: req.ip ?? null })
        .where(eq(apiKeys.id, apiKey.id))
        .catch(() => undefined);

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        emailVerified: user.emailVerified,
        isSuspended: user.isSuspended,
        isAdmin: user.isAdmin,
        apiKeyId: apiKey.id,
        scopes: apiKey.scopes,
      };
      next();
      return;
    }

    // JWT path
    const payload = verifyAccessToken(token);
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user) throw new UnauthorizedError('User not found');
    if (user.isSuspended) throw new ForbiddenError('Account suspended', 'ACCOUNT_SUSPENDED');

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      emailVerified: user.emailVerified,
      isSuspended: user.isSuspended,
      isAdmin: user.isAdmin,
      sessionId: payload.sid,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractBearer(req.headers.authorization);
  if (!token) {
    next();
    return;
  }
  await requireAuth(req, _res, next);
}

export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  if (!req.user.emailVerified) {
    next(new ForbiddenError('Please verify your email to perform this action', 'EMAIL_NOT_VERIFIED'));
    return;
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  if (req.user.apiKeyId) {
    next(new ForbiddenError('Admin access not allowed via API keys', 'FORBIDDEN'));
    return;
  }
  if (!req.user.isAdmin) {
    next(new ForbiddenError('Admin access required', 'FORBIDDEN'));
    return;
  }
  next();
}

export function requireScope(scope: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    // JWT auth bypasses scope check (full access)
    if (!req.user.apiKeyId) {
      next();
      return;
    }
    if (!req.user.scopes?.includes(scope)) {
      next(new ForbiddenError(`Missing required scope: ${scope}`));
      return;
    }
    next();
  };
}

// Suppress unused import warning - kept for future use
void gt;
