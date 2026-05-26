/**
 * Centralized constants. No magic numbers anywhere else.
 */

export const PLAN_LIMITS = {
  FREE: {
    maxForms: 5,
    maxResponsesPerMonth: 100,
    maxApiKeys: 1,
    maxWebhooksPerForm: 1,
    maxFileSizeBytes: 5 * 1024 * 1024,
    webhookLogRetentionDays: 7,
    customSlug: false,
    removeBranding: false,
  },
  PRO: {
    maxForms: Infinity,
    maxResponsesPerMonth: 10_000,
    maxApiKeys: 5,
    maxWebhooksPerForm: 5,
    maxFileSizeBytes: 50 * 1024 * 1024,
    webhookLogRetentionDays: 30,
    customSlug: true,
    removeBranding: true,
  },
  ENTERPRISE: {
    maxForms: Infinity,
    maxResponsesPerMonth: Infinity,
    maxApiKeys: Infinity,
    maxWebhooksPerForm: Infinity,
    maxFileSizeBytes: 100 * 1024 * 1024,
    webhookLogRetentionDays: 90,
    customSlug: true,
    removeBranding: true,
  },
} as const;

export const RATE_LIMITS = {
  AUTH_LOGIN: { points: 5, durationSec: 900 },
  AUTH_REGISTER: { points: 3, durationSec: 3600 },
  AUTH_RESEND_VERIFICATION: { points: 1, durationSec: 60 },
  AUTH_PASSWORD_RESET: { points: 3, durationSec: 3600 },
  PUBLIC_SUBMIT: { points: 10, durationSec: 3600 },
  API_FREE: { points: 100, durationSec: 60 },
  API_PRO: { points: 1000, durationSec: 60 },
  API_ENTERPRISE: { points: 5000, durationSec: 60 },
} as const;

export const LOGIN_FAILURE_LOCK = {
  maxAttempts: 5,
  windowSec: 900,
  lockoutSec: 900,
} as const;

export const TOKEN_TTL = {
  EMAIL_VERIFICATION_SEC: 24 * 60 * 60,
  PASSWORD_RESET_SEC: 60 * 60,
  TEAM_INVITE_SEC: 7 * 24 * 60 * 60,
  IDEMPOTENCY_SEC: 24 * 60 * 60,
  EDGE_CACHE_SEC: 60,
} as const;

export const WEBHOOK_CONFIG = {
  retryDelaysSec: [0, 60, 5 * 60, 30 * 60, 2 * 60 * 60],
  maxAttempts: 5,
  autoDisableAfterConsecutiveFailures: 20,
  notifyAfterConsecutiveFailures: 3,
  responseBodyMaxBytes: 8 * 1024,
  timeoutMs: 10_000,
} as const;

export const SUBMIT_GUARDS = {
  minSubmitTimeMs: 3000,        // < 3s = bot
  honeypotFieldName: 'email_address_verify',
  viewDebounceSec: 30,
} as const;

export const EXPORT_LIMITS = {
  maxRows: 2000,
} as const;
