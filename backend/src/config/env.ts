/**
 * Environment validation. Fails-fast on boot if anything is missing/invalid.
 * Imported once at startup from server.ts / worker.ts.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be ≥32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  API_KEY_PEPPER: z.string().min(16, 'API_KEY_PEPPER must be ≥16 chars'),
  WEBHOOK_HMAC_SECRET: z.string().min(16),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  FROM_EMAIL: z.string().email(),
  FROM_NAME: z.string().default('FormNest'),

  FRONTEND_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  MAX_FILE_SIZE_FREE: z.coerce.number().int().positive().default(5_242_880),
  MAX_FILE_SIZE_PRO: z.coerce.number().int().positive().default(52_428_800),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_PUBLIC_URL: z.string().url(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE_YEARLY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Cannot use logger yet — env not validated. Use process.stderr directly.
  process.stderr.write('❌ Invalid environment variables:\n');
  process.stderr.write(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.stderr.write('\n');
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
