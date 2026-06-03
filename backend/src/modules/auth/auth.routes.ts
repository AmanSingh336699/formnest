import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetLimiter,
  resendVerificationLimiter,
  verifyEmailLimiter,
} from '../../middleware/rateLimiter.middleware';
import {
  RegisterBodySchema,
  LoginBodySchema,
  VerifyEmailBodySchema,
  ResendVerificationBodySchema,
  ForgotPasswordBodySchema,
  ResetPasswordBodySchema,
  AuthResponseSchema,
} from './auth.validators';
import { registry, ErrorSchema } from '../../openapi/registry';

const router = Router();

router.post(
  '/register',
  registerRateLimiter,
  validate({ body: RegisterBodySchema }),
  authController.register,
);

router.post('/login', loginRateLimiter, validate({ body: LoginBodySchema }), authController.login);

router.post('/refresh', authController.refresh);

router.post('/logout', authController.logout);

router.post(
  '/verify-email',
  verifyEmailLimiter,
  validate({ body: VerifyEmailBodySchema }),
  authController.verifyEmail,
);

router.post(
  '/resend-verification',
  resendVerificationLimiter,
  validate({ body: ResendVerificationBodySchema }),
  authController.resendVerification,
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate({ body: ForgotPasswordBodySchema }),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  passwordResetLimiter,
  validate({ body: ResetPasswordBodySchema }),
  authController.resetPassword,
);

// OpenAPI registrations
registry.registerPath({
  method: 'post',
  path: '/auth/register',
  summary: 'Register a new user account',
  tags: ['Auth'],
  security: [],
  request: { body: { content: { 'application/json': { schema: RegisterBodySchema } } } },
  responses: {
    201: { description: 'Account created', content: { 'application/json': { schema: AuthResponseSchema } } },
    409: { description: 'Email already registered', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  summary: 'Authenticate and obtain access token',
  tags: ['Auth'],
  security: [],
  request: { body: { content: { 'application/json': { schema: LoginBodySchema } } } },
  responses: {
    200: { description: 'Authenticated', content: { 'application/json': { schema: AuthResponseSchema } } },
    401: { description: 'Invalid credentials', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  summary: 'Rotate refresh token and issue new access token',
  tags: ['Auth'],
  security: [],
  responses: {
    200: { description: 'New tokens issued', content: { 'application/json': { schema: AuthResponseSchema } } },
    401: { description: 'Invalid refresh token', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  summary: 'Revoke current refresh token',
  tags: ['Auth'],
  security: [],
  responses: { 204: { description: 'Logged out' } },
});

export { router as authRoutes };
