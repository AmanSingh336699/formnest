import { logger } from '../config/logger';

const REDIS_OPERATION_TIMEOUT_MS = 800;
const REDIS_FAILURE_COOLDOWN_MS = 10_000;

let skipUntil = 0;

function shouldSkipRedis(): boolean {
  return Date.now() < skipUntil;
}

function markRedisFailure(err: unknown, operation: string): void {
  skipUntil = Date.now() + REDIS_FAILURE_COOLDOWN_MS;
  logger.warn({ err, operation }, 'Redis unavailable; continuing without cache');
}

function withTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Redis ${operation} timed out`)), REDIS_OPERATION_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

type SafeRedisResult<T> = { ok: true; value: T } | { ok: false };

export async function safeRedisResult<T>(operation: string, action: () => Promise<T>): Promise<SafeRedisResult<T>> {
  if (shouldSkipRedis()) return { ok: false };

  try {
    return { ok: true, value: await withTimeout(action(), operation) };
  } catch (err) {
    markRedisFailure(err, operation);
    return { ok: false };
  }
}

export async function safeRedis<T>(operation: string, action: () => Promise<T>): Promise<T | null> {
  const result = await safeRedisResult(operation, action);
  return result.ok ? result.value : null;
}

export async function safeRedisWrite(operation: string, action: () => Promise<unknown>): Promise<void> {
  await safeRedis(operation, action);
}
