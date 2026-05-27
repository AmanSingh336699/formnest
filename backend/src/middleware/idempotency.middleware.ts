/**
 * Idempotency-Key middleware. Caches successful response bodies in Redis for 24h.
 * Apply selectively on POST/PATCH/DELETE that are unsafe to repeat.
 */
import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { ConflictError } from '../lib/AppError';
import { TOKEN_TTL } from '../lib/constants';
import { safeRedisResult, safeRedisWrite } from '../lib/redisSafe';

const HEADER = 'idempotency-key';

interface CachedResponse {
  status: number;
  body: unknown;
}

export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const key = req.headers[HEADER];
    if (typeof key !== 'string' || key.length < 8 || key.length > 128) {
      next();
      return;
    }

    const scope = req.user?.id ?? req.ip ?? 'anon';
    const cacheKey = `idem:${scope}:${key}`;

    const cached = await safeRedisResult('idempotency:get', () => redis.get(cacheKey));
    if (cached.ok && cached.value) {
      try {
        const parsed = JSON.parse(cached.value) as CachedResponse;
        res.status(parsed.status).json(parsed.body);
        return;
      } catch {
        // corrupted cache entry, fall through
      }
    }

    // Lock to prevent concurrent duplicate processing
    const lockAcquired = await safeRedisResult('idempotency:lock', () => redis.set(`${cacheKey}:lock`, '1', 'EX', 30, 'NX'));
    if (lockAcquired.ok && !lockAcquired.value) {
      throw new ConflictError(
        'A request with this idempotency key is already being processed',
        'IDEMPOTENCY_CONFLICT',
      );
    }

    const originalJson = res.json.bind(res);
    res.json = function patched(body: unknown): Response {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void safeRedisWrite('idempotency:set', () =>
          redis.set(cacheKey, JSON.stringify({ status: res.statusCode, body }), 'EX', TOKEN_TTL.IDEMPOTENCY_SEC),
        );
      }
      void safeRedisWrite('idempotency:unlock', () => redis.del(`${cacheKey}:lock`));
      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
}
