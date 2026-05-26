import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', usersController.me);
router.patch('/', usersController.updateMe);
router.post('/change-password', usersController.changePassword);
router.get('/export', usersController.exportData);
router.delete('/', usersController.deleteMe);

export { router as usersRoutes };
