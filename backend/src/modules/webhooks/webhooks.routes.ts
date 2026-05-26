import { Router } from 'express';
import { webhooksController } from './webhooks.controller';
import { requireAuth, requireScope } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  CreateWebhookBodySchema,
  UpdateWebhookBodySchema,
  WebhookIdParamsSchema,
  FormIdParamsSchema,
  ListDeliveriesQuerySchema,
} from './webhooks.validators';

// Nested under /forms/:id/webhooks
const formScopedRouter = Router({ mergeParams: true });
formScopedRouter.use(requireAuth);
formScopedRouter.get(
  '/:id/webhooks',
  validate({ params: FormIdParamsSchema }),
  requireScope('webhooks:manage'),
  webhooksController.listForForm,
);
formScopedRouter.post(
  '/:id/webhooks',
  validate({ params: FormIdParamsSchema, body: CreateWebhookBodySchema }),
  requireScope('webhooks:manage'),
  webhooksController.create,
);

// Standalone /webhooks/:id
const singleRouter = Router();
singleRouter.use(requireAuth);
singleRouter.patch(
  '/:id',
  validate({ params: WebhookIdParamsSchema, body: UpdateWebhookBodySchema }),
  requireScope('webhooks:manage'),
  webhooksController.update,
);
singleRouter.delete(
  '/:id',
  validate({ params: WebhookIdParamsSchema }),
  requireScope('webhooks:manage'),
  webhooksController.remove,
);
singleRouter.post(
  '/:id/test',
  validate({ params: WebhookIdParamsSchema }),
  requireScope('webhooks:manage'),
  webhooksController.test,
);
singleRouter.get(
  '/:id/deliveries',
  validate({ params: WebhookIdParamsSchema, query: ListDeliveriesQuerySchema }),
  requireScope('webhooks:manage'),
  webhooksController.listDeliveries,
);
singleRouter.post(
  '/:id/deliveries/:deliveryId/retry',
  validate({ params: WebhookIdParamsSchema.extend({ deliveryId: WebhookIdParamsSchema.shape.id }) }),
  requireScope('webhooks:manage'),
  webhooksController.retryDelivery,
);

export const webhookFormSubRoutes = formScopedRouter;
export const webhookSingleRoutes = singleRouter;
