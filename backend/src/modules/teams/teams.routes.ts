import { Router } from 'express';
import { teamsController } from './teams.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', teamsController.list);
router.post('/', teamsController.create);
router.post('/accept', teamsController.accept);
router.get('/:id/members', teamsController.members);
router.post('/:id/invite', teamsController.invite);
router.delete('/:id/members/:userId', teamsController.removeMember);

export { router as teamsRoutes };
