/**
 * JWT helpers. HS256 in MVP. Payload kept minimal (userId, sessionId, plan).
 */
import jwt, { type SignOptions, type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from './AppError';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;        // userId
  sid: string;        // sessionId (refresh token id)
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
}

export function signAccessToken(payload: Omit<AccessTokenPayload, keyof JwtPayload>): string {
  const opts: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: 'formnest',
    audience: 'formnest-api',
  };
  return jwt.sign(payload, env.JWT_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'formnest',
      audience: 'formnest-api',
    });
    if (typeof decoded === 'string') {
      throw new UnauthorizedError('Invalid token', 'TOKEN_INVALID');
    }
    return decoded as AccessTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid token', 'TOKEN_INVALID');
  }
}
