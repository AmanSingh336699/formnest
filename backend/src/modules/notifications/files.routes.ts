import { Router } from 'express';
import { filesController } from './files.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { uploadSingleFile } from '../../middleware/upload.middleware';

const router = Router();
router.use(requireAuth);

router.post('/upload-url', filesController.createUploadUrl);
router.post('/upload', uploadSingleFile, filesController.uploadDirect);
router.get('/:id', filesController.getDownloadUrl);

export { router as filesRoutes };
