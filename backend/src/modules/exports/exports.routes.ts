import { Router } from 'express';
import { exportsController } from './exports.controller';
import { requireAuth, requireScope } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);
router.get('/forms/:id/export.csv', requireScope('responses:read'), exportsController.csv);

export { router as exportsRoutes };
