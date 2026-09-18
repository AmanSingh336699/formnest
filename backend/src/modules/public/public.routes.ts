import { Router } from 'express';
import { publicController } from './public.controller';
import { validate } from '../../middleware/validate.middleware';
import { publicSubmitLimiter } from '../../middleware/rateLimiter.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { SubmitBodySchema, SlugParamsSchema, FormIdParamsSchema } from './public.validators';
import { uploadSingleFile } from '../../middleware/upload.middleware';

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
  '/forms/:formId/upload-url',
  publicController.createUploadUrl,
);

router.post(
  '/forms/:formId/upload',
  uploadSingleFile,
  publicController.uploadDirect,
);

router.post(
  '/forms/by-slug/:slug/submit',
  publicSubmitLimiter,
  idempotencyMiddleware,
  validate({ params: SlugParamsSchema, body: SubmitBodySchema }),
  publicController.submit,
);

export { router as publicRoutes };
