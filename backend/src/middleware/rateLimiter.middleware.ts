/**
 * Redis-backed sliding-window rate limiter.
 * Returns 429 with X-RateLimit-* headers.
 */
import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { RateLimitError } from '../lib/AppError';
import { RATE_LIMITS } from '../lib/constants';
import { safeRedis } from '../lib/redisSafe';

export interface RateLimitOptions {
  points: number;       // max requests
  durationSec: number;  // window
  keyPrefix: string;
  identifierFn?: (req: Request) => string;
}

const SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetMs = window * 1000
  if oldest[2] then resetMs = (tonumber(oldest[2]) + window * 1000) - now end
  return {count, resetMs}
end
redis.call('ZADD', key, now, now .. ':' .. math.random())
redis.call('EXPIRE', key, window + 1)
return {count + 1, window * 1000}
`;

export function createRateLimiter(opts: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = opts.identifierFn?.(req) ?? req.ip ?? 'unknown';
      const key = `rl:${opts.keyPrefix}:${identifier}`;
      const now = Date.now();

      const result = await safeRedis('rate-limit:eval', () =>
        redis.eval(
          SCRIPT,
          1,
          key,
          String(now),
          String(opts.durationSec),
          String(opts.points),
        ) as Promise<[number, number]>,
      );

      if (!result) {
        next();
        return;
      }

      const [count, resetMs] = result;
      const remaining = Math.max(0, opts.points - count);

      res.setHeader('X-RateLimit-Limit', String(opts.points));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetMs / 1000)));

      if (count > opts.points) {
        res.setHeader('Retry-After', String(Math.ceil(resetMs / 1000)));
        throw new RateLimitError('Too many requests, please try again later', Math.ceil(resetMs / 1000));
      }
      next();
    } catch (err) {
      if (err instanceof RateLimitError) {
        next(err);
        return;
      }
      next();
    }
  };
}

export const loginRateLimiter = createRateLimiter({
  ...RATE_LIMITS.AUTH_LOGIN,
  keyPrefix: 'auth:login',
});

export const registerRateLimiter = createRateLimiter({
  ...RATE_LIMITS.AUTH_REGISTER,
  keyPrefix: 'auth:register',
});

export const verifyEmailLimiter = createRateLimiter({
  ...RATE_LIMITS.AUTH_VERIFY_EMAIL,
  keyPrefix: 'auth:verify-email',
  identifierFn: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : 'unknown';
    return `${email}:${req.ip ?? 'unknown'}`;
  },
});

export const resendVerificationLimiter = createRateLimiter({
  ...RATE_LIMITS.AUTH_RESEND_VERIFICATION,
  keyPrefix: 'auth:resend',
  identifierFn: (req) => req.user?.id ?? req.ip ?? 'unknown',
});

export const passwordResetLimiter = createRateLimiter({
  ...RATE_LIMITS.AUTH_PASSWORD_RESET,
  keyPrefix: 'auth:reset',
});

export const publicSubmitLimiter = createRateLimiter({
  ...RATE_LIMITS.PUBLIC_SUBMIT,
  keyPrefix: 'public:submit',
  identifierFn: (req) => `${req.params.formId ?? req.params.id}:${req.ip ?? 'unknown'}`,
});

export function apiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const plan = req.user?.plan ?? 'FREE';
  const limits =
    plan === 'ENTERPRISE'
      ? RATE_LIMITS.API_ENTERPRISE
      : plan === 'PRO'
        ? RATE_LIMITS.API_PRO
        : RATE_LIMITS.API_FREE;

  const limiter = createRateLimiter({
    ...limits,
    keyPrefix: `api:${plan.toLowerCase()}`,
    identifierFn: (r) => r.user?.id ?? r.ip ?? 'unknown',
  });
  void limiter(req, res, next);
}
