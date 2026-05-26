/**
 * GDPR-compliant IP anonymization. Never store raw IPs.
 * IPv4 → zero last octet. IPv6 → zero last 80 bits (keep /48).
 */
import crypto from 'node:crypto';

export function anonymizeIp(ip: string | undefined | null): string {
  if (!ip) return '0.0.0.0';
  // strip ipv6 mapped prefix
  const clean = ip.replace(/^::ffff:/, '');

  // IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(clean)) {
    const parts = clean.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  // IPv6 — keep first 3 hextets (48 bits)
  if (clean.includes(':')) {
    const segments = clean.split(':');
    const kept = segments.slice(0, 3).join(':');
    return `${kept}::`;
  }

  return '0.0.0.0';
}

export function hashIp(ip: string | undefined | null): string {
  const anon = anonymizeIp(ip);
  return crypto.createHash('sha256').update(anon).digest('hex');
}
