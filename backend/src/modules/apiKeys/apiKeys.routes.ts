import { Router } from 'express';
import { apiKeysController } from './apiKeys.controller';
import { requireAuth, requireVerifiedEmail } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', apiKeysController.list);
router.post('/', requireVerifiedEmail, apiKeysController.create);
router.get('/:id/reveal', requireVerifiedEmail, apiKeysController.reveal);
router.delete('/:id', apiKeysController.revoke);

export { router as apiKeysRoutes };
