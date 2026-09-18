import bcrypt from 'bcrypt';
import { env } from '../config/env';

const MIN_LENGTH = 6;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

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
