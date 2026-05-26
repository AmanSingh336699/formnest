/**
 * Stripe-style webhook signature: t=<timestamp>,v1=<hex hmac>
 * Receiver verifies signature within 5-min window to prevent replay.
 */
import crypto from 'node:crypto';

const SIG_VERSION = 'v1';
const REPLAY_WINDOW_SECONDS = 300;

export function signWebhookPayload(secret: string, payload: string, timestampSec?: number): string {
  const ts = timestampSec ?? Math.floor(Date.now() / 1000);
  const signedString = `${ts}.${payload}`;
  const sig = crypto.createHmac('sha256', secret).update(signedString).digest('hex');
  return `t=${ts},${SIG_VERSION}=${sig}`;
}

export function verifyWebhookSignature(
  secret: string,
  payload: string,
  signatureHeader: string,
): boolean {
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, kv) => {
    const [k, v] = kv.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const ts = parts.t;
  const sig = parts[SIG_VERSION];
  if (!ts || !sig) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > REPLAY_WINDOW_SECONDS) return false;

  const signedString = `${ts}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedString).digest('hex');

  if (expected.length !== sig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
}

/**
 * Symmetric AES-256-GCM encryption for webhook secrets stored in DB.
 * Key derived from WEBHOOK_HMAC_SECRET env.
 */
export function encryptSecret(plaintext: string, masterKey: string): string {
  const key = crypto.createHash('sha256').update(masterKey).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(ciphertext: string, masterKey: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format');
  const [ivB64, tagB64, encB64] = parts;
  if (!ivB64 || !tagB64 || !encB64) throw new Error('Invalid encrypted secret parts');

  const key = crypto.createHash('sha256').update(masterKey).digest();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
