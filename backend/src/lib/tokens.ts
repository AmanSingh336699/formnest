import crypto from 'node:crypto';

export interface OpaqueToken {
  raw: string;        // included in email link, never persisted
  hash: string;       // stored in DB
}

export function generateOpaqueToken(bytes = 32): OpaqueToken {
  const raw = crypto.randomBytes(bytes).toString('base64url');
  const hash = hashOpaqueToken(raw);
  return { raw, hash };
}

export function hashOpaqueToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
