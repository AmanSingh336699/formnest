import { eq } from 'drizzle-orm';
import { db, closeDatabase } from '../src/config/database';
import { users } from './schema/users';
import { hashPassword } from '../src/lib/password';
import { logger } from '../src/config/logger';
import { env } from '../src/config/env';

/**
 * Idempotent Database Seeder
 * Provisions the initial Admin account with ENTERPRISE plan and verified status.
 */
async function runSeed(): Promise<void> {
  try {
    const adminEmail = env.ADMIN_EMAIL?.toLowerCase().trim();
    const adminPassword = env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      logger.fatal(
        'Database seed aborted: ADMIN_EMAIL and ADMIN_PASSWORD must be defined in environment (.env). Never commit credentials to source control.',
      );
      process.exit(1);
    }

    const adminName = 'FormNest Admin';

    logger.info({ adminEmail }, 'Starting database seeding...');

    const passwordHash = await hashPassword(adminPassword);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingUser) {
      await db
        .update(users)
        .set({
          isAdmin: true,
          emailVerified: true,
          emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
          plan: 'ENTERPRISE',
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));

      logger.info(
        { userId: existingUser.id, adminEmail },
        'Existing user verified and updated with Admin and ENTERPRISE plan.',
      );
    } else {
      const [created] = await db
        .insert(users)
        .values({
          email: adminEmail,
          name: adminName,
          passwordHash,
          isAdmin: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          plan: 'ENTERPRISE',
          locale: 'en',
          timezone: 'UTC',
        })
        .returning({ id: users.id, email: users.email });

      logger.info(
        { userId: created?.id, adminEmail },
        'New Admin user successfully seeded with ENTERPRISE plan.',
      );
    }

    logger.info('Database seeding completed successfully.');
  } catch (err) {
    logger.fatal({ err }, 'Database seed process failed');
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

runSeed();
