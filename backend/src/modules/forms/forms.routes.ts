import { Router } from 'express';
import { formsController } from './forms.controller';
import { requireAuth, requireScope, requireVerifiedEmail } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  CreateFormBodySchema,
  UpdateFormBodySchema,
  FormIdParamsSchema,
  ListFormsQuerySchema,
  FormResponseSchema,
} from './forms.validators';
import { registry, ErrorSchema } from '../../openapi/registry';

const router = Router();

router.use(requireAuth);

router.get('/', validate({ query: ListFormsQuerySchema }), requireScope('forms:read'), formsController.list);
router.post('/', requireVerifiedEmail, validate({ body: CreateFormBodySchema }), requireScope('forms:write'), formsController.create);
router.get('/:id', validate({ params: FormIdParamsSchema }), requireScope('forms:read'), formsController.getOne);
router.patch('/:id', validate({ params: FormIdParamsSchema, body: UpdateFormBodySchema }), requireScope('forms:write'), formsController.update);
router.delete('/:id', validate({ params: FormIdParamsSchema }), requireScope('forms:write'), formsController.remove);
router.post('/:id/publish', requireVerifiedEmail, validate({ params: FormIdParamsSchema }), requireScope('forms:write'), formsController.publish);
router.post('/:id/close', validate({ params: FormIdParamsSchema }), requireScope('forms:write'), formsController.close);
router.post('/:id/duplicate', validate({ params: FormIdParamsSchema }), requireScope('forms:write'), formsController.duplicate);

// OpenAPI registrations
registry.registerPath({
  method: 'get',
  path: '/forms',
  summary: 'List your forms',
  tags: ['Forms'],
  responses: {
    200: {
      description: 'List of forms',
      content: { 'application/json': { schema: FormResponseSchema.array() } },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/forms',
  summary: 'Create a new form',
  tags: ['Forms'],
  request: { body: { content: { 'application/json': { schema: CreateFormBodySchema } } } },
  responses: {
    201: { description: 'Form created', content: { 'application/json': { schema: FormResponseSchema } } },
    402: { description: 'Plan limit reached', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/forms/{id}',
  summary: 'Get form by ID with fields',
  tags: ['Forms'],
  request: { params: FormIdParamsSchema },
  responses: {
    200: { description: 'Form details', content: { 'application/json': { schema: FormResponseSchema } } },
    404: { description: 'Form not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/forms/{id}',
  summary: 'Update form',
  tags: ['Forms'],
  request: {
    params: FormIdParamsSchema,
    body: { content: { 'application/json': { schema: UpdateFormBodySchema } } },
  },
  responses: {
    200: { description: 'Updated form', content: { 'application/json': { schema: FormResponseSchema } } },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/forms/{id}',
  summary: 'Delete form (and all responses)',
  tags: ['Forms'],
  request: { params: FormIdParamsSchema },
  responses: { 204: { description: 'Deleted' } },
});

registry.registerPath({
  method: 'post',
  path: '/forms/{id}/publish',
  summary: 'Publish a form (make it accessible publicly)',
  tags: ['Forms'],
  request: { params: FormIdParamsSchema },
  responses: { 200: { description: 'Published form', content: { 'application/json': { schema: FormResponseSchema } } } },
});

registry.registerPath({
  method: 'post',
  path: '/forms/{id}/duplicate',
  summary: 'Duplicate a form',
  tags: ['Forms'],
  request: { params: FormIdParamsSchema },
  responses: { 201: { description: 'Duplicated form', content: { 'application/json': { schema: FormResponseSchema } } } },
});

export { router as formsRoutes };
