import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { users, type UserPlan } from '../../drizzle/schema/users';
import { verifyAccessToken } from '../lib/jwt';
import { UnauthorizedError, ForbiddenError } from '../lib/AppError';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  emailVerified: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  sessionId?: string;
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
  if (!req.user.isAdmin) {
    next(new ForbiddenError('Admin access required', 'FORBIDDEN'));
    return;
  }
  next();
}

export function requireScope(_scope: string) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };
}
