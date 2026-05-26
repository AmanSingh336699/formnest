import { z } from 'zod';

export const ListResponsesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    includeSpam: z.preprocess(
      (v) => v === 'true' || v === '1' || v === true,
      z.boolean(),
    ).default(false),
    sort: z.enum(['createdAt', '-createdAt']).default('-createdAt'),
  })
  .strict();

export const FormIdParamsSchema = z.object({ id: z.string().min(1).max(50) });

export const ResponseIdParamsSchema = z.object({ id: z.string().min(1).max(50) });
