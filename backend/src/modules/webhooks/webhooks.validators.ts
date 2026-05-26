import { z } from 'zod';
import { registry } from '../../openapi/registry';

export const CreateWebhookBodySchema = registry.register(
  'CreateWebhookBody',
  z
    .object({
      url: z.string().url().startsWith('https://', 'Webhook URL must be HTTPS').max(2000),
      events: z.array(z.enum(['response.created', 'form.published', 'form.closed'])).min(1).max(5),
    })
    .strict(),
);

export const UpdateWebhookBodySchema = z
  .object({
    url: z.string().url().startsWith('https://').max(2000).optional(),
    events: z.array(z.enum(['response.created', 'form.published', 'form.closed'])).min(1).max(5).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const WebhookIdParamsSchema = z.object({ id: z.string().min(1).max(50) });
export const FormIdParamsSchema = z.object({ id: z.string().min(1).max(50) });
export const DeliveryIdParamsSchema = z.object({
  id: z.string().min(1).max(50),
  deliveryId: z.string().min(1).max(50),
});

export const ListDeliveriesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'DEAD']).optional(),
  })
  .strict();
