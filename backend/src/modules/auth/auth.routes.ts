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
} from './auth.validators';

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

export { router as authRoutes };
