/**
 * Drizzle ORM singleton with postgres.js driver.
 * Connection pool sized for typical Node API workload.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env, isProd } from './env';
import { logger } from './logger';
import * as schema from '../../drizzle/schema';

const queryClient = postgres(env.DATABASE_URL, {
  max: isProd ? 20 : 5,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false, // safer with pgBouncer / serverless poolers
  onnotice: () => {
    // suppress NOTICE messages from filling logs
  },
});

export const db = drizzle(queryClient, { schema, logger: false });

export type Database = typeof db;

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, 'Database health check failed');
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  logger.info('Closing database connections...');
  await queryClient.end({ timeout: 5 });
}
