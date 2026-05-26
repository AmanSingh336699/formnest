import { Router } from 'express';
import { filesController } from './files.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.post('/upload-url', filesController.createUploadUrl);
router.get('/:id', filesController.getDownloadUrl);

export { router as filesRoutes };
