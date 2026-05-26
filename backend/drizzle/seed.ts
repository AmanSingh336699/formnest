/**
 * Local development seed. Creates a verified test user + sample form.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';
import { users } from './schema/users';
import { forms, formFields } from './schema/forms';

async function main(): Promise<void> {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  const email = 'demo@formnest.com';
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  let userId: string;
  if (!existing) {
    const [created] = await db
      .insert(users)
      .values({
        email,
        name: 'Demo User',
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        plan: 'PRO',
      })
      .returning({ id: users.id });
    if (!created) throw new Error('Failed to create demo user');
    userId = created.id;
    logger.info({ email, password: 'DemoPass123!' }, 'Demo user created');
  } else {
    userId = existing.id;
    logger.info('Demo user already exists');
  }

  const [form] = await db
    .insert(forms)
    .values({
      userId,
      title: 'Customer Feedback (Demo)',
      description: 'A sample form to try out FormNest.',
      slug: 'demoform',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      theme: { preset: 'clean' },
      settings: { successMessage: 'Thanks for your feedback!' },
    })
    .returning({ id: forms.id });

  if (form) {
    await db.insert(formFields).values([
      { formId: form.id, type: 'TEXT_SHORT', label: 'Your name', placeholder: 'Jane Doe', required: true, position: 0 },
      { formId: form.id, type: 'EMAIL', label: 'Email', placeholder: 'you@example.com', required: true, position: 1 },
      {
        formId: form.id,
        type: 'RATING',
        label: 'How was your experience?',
        required: true,
        position: 2,
        options: { ratingType: 'stars', ratingMax: 5 },
      },
      { formId: form.id, type: 'TEXT_LONG', label: 'Any other comments?', required: false, position: 3 },
    ]);
    logger.info({ formId: form.id }, 'Demo form created');
  }

  await sql.end({ timeout: 5 });
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Seed failed');
  process.exit(1);
});
