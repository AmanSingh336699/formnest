import { Router } from 'express';
import { publicController } from './public.controller';
import { validate } from '../../middleware/validate.middleware';
import { publicSubmitLimiter } from '../../middleware/rateLimiter.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { SubmitBodySchema, SlugParamsSchema, FormIdParamsSchema } from './public.validators';
import { registry, ErrorSchema } from '../../openapi/registry';

const router = Router();

router.get('/forms/:slug', validate({ params: SlugParamsSchema }), publicController.getBySlug);

router.post(
  '/forms/:formId/start',
  validate({ params: FormIdParamsSchema }),
  publicController.trackStart,
);

router.post(
  '/forms/:formId/submit',
  publicSubmitLimiter,
  idempotencyMiddleware,
  validate({ params: FormIdParamsSchema, body: SubmitBodySchema }),
  publicController.submit,
);

router.post(
  '/forms/by-slug/:slug/submit',
  publicSubmitLimiter,
  idempotencyMiddleware,
  validate({ params: SlugParamsSchema, body: SubmitBodySchema }),
  publicController.submit,
);

// OpenAPI
registry.registerPath({
  method: 'get',
  path: '/public/forms/{slug}',
  summary: 'Get a published form by slug (public, no auth)',
  tags: ['Public'],
  security: [],
  request: { params: SlugParamsSchema },
  responses: {
    200: { description: 'Public form payload', content: { 'application/json': { schema: { type: 'object' } as never } } },
    404: { description: 'Form not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/public/forms/{formId}/submit',
  summary: 'Submit a response (public, no auth, idempotent)',
  tags: ['Public'],
  security: [],
  request: { params: FormIdParamsSchema, body: { content: { 'application/json': { schema: SubmitBodySchema } } } },
  responses: {
    201: { description: 'Response accepted', content: { 'application/json': { schema: { type: 'object' } as never } } },
    400: { description: 'Validation failed', content: { 'application/json': { schema: ErrorSchema } } },
    403: { description: 'Form closed or limit reached', content: { 'application/json': { schema: ErrorSchema } } },
    429: { description: 'Rate limited', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

export { router as publicRoutes };
