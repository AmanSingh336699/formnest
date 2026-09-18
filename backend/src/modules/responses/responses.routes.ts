import { Router } from 'express';
import { responsesController } from './responses.controller';
import { requireAuth, requireScope } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { ListResponsesQuerySchema, FormIdParamsSchema, ResponseIdParamsSchema } from './responses.validators';

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

export const responseFormSubRoutes = formRouter;
export const responseSingleRoutes = singleRouter;
