/**
 * ioredis singletons.
 * Separate clients for general ops vs BullMQ (BullMQ requires its own connection settings).
 */
import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const baseOpts = {
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  retryStrategy(times: number): number {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
};

export const redis = new Redis(env.REDIS_URL, {
  ...baseOpts,
  maxRetriesPerRequest: 1,
  commandTimeout: 5_000,
  retryStrategy(times: number): number | null {
    if (times > 2) return null;
    return Math.min(times * 200, 1_000);
  },
});

/** Dedicated Redis connection for BullMQ (must have maxRetriesPerRequest = null, no commandTimeout). */
export const queueRedis = new Redis(env.REDIS_URL, baseOpts);

redis.on('error', (err) => logger.error({ err }, 'Redis error'));
redis.on('connect', () => logger.info('Redis connected'));

queueRedis.on('error', (err) => logger.error({ err }, 'Queue Redis error'));

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (err) {
    logger.error({ err }, 'Redis health check failed');
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  logger.info('Closing Redis connections...');
  await Promise.all([redis.quit(), queueRedis.quit()]);
}