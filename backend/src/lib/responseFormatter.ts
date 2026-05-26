/**
 * Consistent API response envelope: { data, meta, error }
 * Exactly one of `data` or `error` is populated.
 */
import type { Response } from 'express';
import type { ErrorCode } from './AppError';

export interface ApiMeta {
  requestId?: string;
  nextCursor?: string | null;
  total?: number;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface ApiErrorBody {
  code: ErrorCode | string;
  message: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  data?: T;
  meta?: ApiMeta;
  error?: ApiErrorBody;
}

export function success<T>(res: Response, data: T, meta?: ApiMeta, status = 200): Response {
  const body: ApiEnvelope<T> = { data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function created<T>(res: Response, data: T, meta?: ApiMeta): Response {
  return success(res, data, meta, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).end();
}

export function failure(
  res: Response,
  status: number,
  code: ErrorCode | string,
  message: string,
  details?: unknown,
  requestId?: string,
): Response {
  const body: ApiEnvelope<never> = {
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    meta: { requestId },
  };
  return res.status(status).json(body);
}
