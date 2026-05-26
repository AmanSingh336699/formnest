/**
 * Global error middleware. Converts every error into a typed envelope.
 * Order matters: must be registered AFTER all routes.
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/AppError';
import { logger } from '../config/logger';
import { failure } from '../lib/responseFormatter';
import { isProd } from '../config/env';

interface PostgresError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

function isPgError(err: unknown): err is PostgresError {
  return err instanceof Error && typeof (err as PostgresError).code === 'string';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId }, 'AppError 5xx');
    } else {
      logger.warn({ errCode: err.errorCode, message: err.message, requestId }, 'AppError 4xx');
    }
    failure(res, err.statusCode, err.errorCode, err.message, err.details, requestId);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.flatten();
    logger.warn({ details, requestId }, 'Validation error');
    failure(res, 400, 'VALIDATION_ERROR', 'Validation failed', details, requestId);
    return;
  }

  if (isPgError(err)) {
    // 23505 = unique violation
    if (err.code === '23505') {
      logger.warn({ err: err.message, constraint: err.constraint, requestId }, 'DB unique violation');
      failure(res, 409, 'CONFLICT', 'A resource with these properties already exists', undefined, requestId);
      return;
    }
    // 23503 = foreign key violation
    if (err.code === '23503') {
      failure(res, 400, 'VALIDATION_ERROR', 'Referenced resource does not exist', undefined, requestId);
      return;
    }
  }

  logger.error({ err, requestId }, 'Unhandled error');
  const message = isProd ? 'Something went wrong, our team has been notified' : (err as Error).message;
  failure(res, 500, 'INTERNAL_ERROR', message, undefined, requestId);
}
