import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redisUrl = env.REDIS_URL;
if (redisUrl.includes('upstash.io') && redisUrl.startsWith('redis://')) {
  redisUrl = redisUrl.replace('redis://', 'rediss://');
}
const isTls = redisUrl.startsWith('rediss://');

const baseOpts = {
  family: 0,
  tls: isTls ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  retryStrategy(times: number): number {
    // Exponential backoff with max 30s delay to save bandwidth & CPU if Redis is unreachable
    const delay = Math.min(1000 * Math.pow(1.5, Math.min(times, 10)), 30000);
    return delay;
  },
};

export const redis = new Redis(redisUrl, {
  ...baseOpts,
  maxRetriesPerRequest: 1,
  commandTimeout: 5_000,
  retryStrategy(times: number): number | null {
    if (times > 2) return null;
    return Math.min(times * 200, 1_000);
  },
});

// Dedicated Redis connection for BullMQ
export const queueRedis = new Redis(redisUrl, baseOpts);

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