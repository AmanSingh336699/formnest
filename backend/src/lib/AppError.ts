/**
 * Typed application error hierarchy. Every thrown error MUST be one of these.
 * Generic `Error` only escapes to 500 path in middleware.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PAYMENT_REQUIRED'
  | 'INTERNAL_ERROR'
  | 'FORM_NOT_FOUND'
  | 'FORM_NOT_PUBLISHED'
  | 'FORM_CLOSED'
  | 'FORM_LIMIT_REACHED'
  | 'RESPONSE_LIMIT_REACHED'
  | 'WEBHOOK_LIMIT_REACHED'
  | 'API_KEY_LIMIT_REACHED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_SUSPENDED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'PLAN_REQUIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'SPAM_DETECTED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCode,
    details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code: ErrorCode = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', code: ErrorCode = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code: ErrorCode = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code: ErrorCode = 'CONFLICT', details?: unknown) {
    super(message, 409, code, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfterSeconds?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfterSeconds });
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Upgrade your plan to continue', code: ErrorCode = 'PAYMENT_REQUIRED') {
    super(message, 402, code);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(message, 500, 'INTERNAL_ERROR', details, false);
  }
}
