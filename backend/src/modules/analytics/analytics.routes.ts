import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { requireAuth, requireScope } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);
router.get('/forms/:id/analytics', requireScope('forms:read'), analyticsController.forForm);

export { router as analyticsRoutes };
