import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const RegisterBodySchema = registry.register(
  'RegisterBody',
  z
    .object({
      email: z.string().email().max(255),
      password: z.string().min(10).max(200),
      name: z.string().min(1).max(100),
    })
    .strict(),
);
export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const LoginBodySchema = registry.register(
  'LoginBody',
  z
    .object({
      email: z.string().email().max(255),
      password: z.string().min(1).max(200),
    })
    .strict(),
);
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const VerifyEmailBodySchema = z
  .object({ token: z.string().min(20).max(200) })
  .strict();
export type VerifyEmailBody = z.infer<typeof VerifyEmailBodySchema>;

export const ResendVerificationBodySchema = z
  .object({ email: z.string().email().max(255) })
  .strict();

export const ForgotPasswordBodySchema = z
  .object({ email: z.string().email().max(255) })
  .strict();

export const ResetPasswordBodySchema = z
  .object({
    token: z.string().min(20).max(200),
    password: z.string().min(10).max(200),
  })
  .strict();

export const AuthResponseSchema = registry.register(
  'AuthResponse',
  z.object({
    data: z.object({
      user: z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string(),
        plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
        emailVerified: z.boolean(),
      }),
      accessToken: z.string(),
      expiresInSec: z.number().int(),
    }),
  }),
);
