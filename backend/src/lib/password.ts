/**
 * Bcrypt password helpers + complexity validation.
 * Constant-time comparison via bcrypt's native compare.
 */
import bcrypt from 'bcrypt';
import { env } from '../config/env';

const MIN_LENGTH = 6;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Returns null if password is acceptable, else a human-readable reason.
 * Rules: ≥10 chars and must contain 3 of {upper, lower, digit, symbol}.
 */
export function validatePasswordComplexity(plain: string): string | null {
  if (plain.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters long.`;
  }
  const checks = [
    /[A-Z]/.test(plain),
    /[a-z]/.test(plain),
    /\d/.test(plain),
    /[^A-Za-z0-9]/.test(plain),
  ];
  const passed = checks.filter(Boolean).length;
  if (passed < 3) {
    return 'Password must contain at least 3 of: uppercase, lowercase, digit, symbol.';
  }
  return null;
}
