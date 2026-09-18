import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env';
import { logger } from '../config/logger';

async function main(): Promise<void> {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  logger.info('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  logger.info('Migrations complete');

  await sql.end({ timeout: 5 });
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Migration failed');
  process.exit(1);
});
