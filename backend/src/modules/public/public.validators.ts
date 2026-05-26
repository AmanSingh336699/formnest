import { z } from 'zod';
import { SUBMIT_GUARDS } from '../../lib/constants';

export const SubmitBodySchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
    loadedAt: z.number().int().positive().optional(),
    submittedAt: z.number().int().positive().optional(),
    referrer: z.string().max(500).optional(),
    // Honeypot field — should be empty
    [SUBMIT_GUARDS.honeypotFieldName]: z.string().max(500).optional(),
  })
  .passthrough(); // we accept extra fields and ignore them silently

export const SlugParamsSchema = z.object({
  slug: z.string().min(3).max(100),
});

export const FormIdParamsSchema = z.object({
  formId: z.string().min(1).max(50),
});
