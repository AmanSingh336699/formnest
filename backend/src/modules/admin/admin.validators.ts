import { z } from 'zod';

export const UserListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 20), z.number().int().min(1).max(100).default(20)),
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
  verified: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : undefined, z.boolean().optional()),
  suspended: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : undefined, z.boolean().optional()),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const ChangeUserPlanSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
  planValidUntil: z.string().nullable().optional(),
  reason: z.string().min(1, 'Reason is required'),
});

export const SuspendUserSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export const UnsuspendUserSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export const VerifyEmailSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export const UserIdParamsSchema = z.object({
  userId: z.string().min(1),
});

export const ListFormsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 20), z.number().int().min(1).max(100).default(20)),
});
