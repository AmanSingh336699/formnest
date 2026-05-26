/**
 * Pagination helpers. Cursor-based (preferred) and offset-based.
 * Cursor encodes (createdAt, id) for stable ordering.
 */
import { Buffer } from 'node:buffer';

export interface CursorPayload {
  createdAt: string;
  id: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string | undefined | null): CursorPayload | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'createdAt' in parsed &&
      'id' in parsed &&
      typeof (parsed as CursorPayload).createdAt === 'string' &&
      typeof (parsed as CursorPayload).id === 'string'
    ) {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export interface OffsetParams {
  page: number;
  limit: number;
  offset: number;
}

export function parseOffsetParams(rawPage: unknown, rawLimit: unknown, maxLimit = 100): OffsetParams {
  const page = Math.max(1, Number.parseInt(String(rawPage ?? '1'), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(String(rawLimit ?? '20'), 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}
