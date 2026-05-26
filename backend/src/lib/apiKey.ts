/**
 * API key generation, hashing, and verification.
 * Format: fn_<32-byte-random-base62>
 * Stored as sha256(rawKey + pepper). Never reversible.
 */
import crypto from 'node:crypto';
import { env } from '../config/env';

const KEY_PREFIX = 'fn_';
const RANDOM_BYTES = 32;

export interface GeneratedApiKey {
  rawKey: string;       // shown ONCE at creation
  keyHash: string;      // stored in DB
  keyPrefix: string;    // for UI display ("fn_abc12345...")
}

export function generateApiKey(): GeneratedApiKey {
  const random = crypto.randomBytes(RANDOM_BYTES).toString('base64url');
  const rawKey = `${KEY_PREFIX}${random}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 11); // "fn_" + first 8 chars
  return { rawKey, keyHash, keyPrefix };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(`${rawKey}${env.API_KEY_PEPPER}`).digest('hex');
}

export function extractKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, 11);
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export function encryptApiKey(rawKey: string): string {
  const key = crypto.scryptSync(env.JWT_SECRET, 'salt', 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(rawKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptApiKey(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  const ivHex = parts[0] as string;
  const tagHex = parts[1] as string;
  const encryptedHex = parts[2] as string;
  
  const key = crypto.scryptSync(env.JWT_SECRET, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted: string = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
