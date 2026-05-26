import { Router } from 'express';
import { responsesController } from './responses.controller';
import { requireAuth, requireScope } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { ListResponsesQuerySchema, FormIdParamsSchema, ResponseIdParamsSchema } from './responses.validators';
import { registry, ErrorSchema } from '../../openapi/registry';

const formRouter = Router({ mergeParams: true });
formRouter.use(requireAuth);
formRouter.get(
  '/:id/responses',
  validate({ params: FormIdParamsSchema, query: ListResponsesQuerySchema }),
  requireScope('responses:read'),
  responsesController.listByForm,
);

const singleRouter = Router();
singleRouter.use(requireAuth);
singleRouter.get(
  '/:id',
  validate({ params: ResponseIdParamsSchema }),
  requireScope('responses:read'),
  responsesController.getOne,
);
singleRouter.delete(
  '/:id',
  validate({ params: ResponseIdParamsSchema }),
  requireScope('responses:write'),
  responsesController.remove,
);
singleRouter.post(
  '/:id/spam',
  validate({ params: ResponseIdParamsSchema }),
  requireScope('responses:write'),
  responsesController.markSpam,
);

registry.registerPath({
  method: 'get',
  path: '/forms/{id}/responses',
  summary: 'List responses for a form',
  tags: ['Responses'],
  request: { params: FormIdParamsSchema, query: ListResponsesQuerySchema },
  responses: {
    200: { description: 'Responses list', content: { 'application/json': { schema: { type: 'object' } as never } } },
    404: { description: 'Form not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/responses/{id}',
  summary: 'Get a single response with all answers',
  tags: ['Responses'],
  request: { params: ResponseIdParamsSchema },
  responses: { 200: { description: 'Response details', content: { 'application/json': { schema: { type: 'object' } as never } } } },
});

registry.registerPath({
  method: 'delete',
  path: '/responses/{id}',
  summary: 'Delete a response',
  tags: ['Responses'],
  request: { params: ResponseIdParamsSchema },
  responses: { 204: { description: 'Deleted' } },
});

export const responseFormSubRoutes = formRouter;
export const responseSingleRoutes = singleRouter;
