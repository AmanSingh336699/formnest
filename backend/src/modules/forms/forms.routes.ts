import { Router } from 'express';
import { formsController } from './forms.controller';
import { requireAuth, requireScope, requireVerifiedEmail } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  CreateFormBodySchema,
  UpdateFormBodySchema,
  FormIdParamsSchema,
  ListFormsQuerySchema,
} from './forms.validators';

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

export { router as formsRoutes };
