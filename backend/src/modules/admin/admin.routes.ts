import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  UserListQuerySchema,
  ChangeUserPlanSchema,
  SuspendUserSchema,
  UnsuspendUserSchema,
  VerifyEmailSchema,
  RevokeApiKeySchema,
  DisableWebhookSchema,
  UserIdParamsSchema,
  KeyIdParamsSchema,
  WebhookIdParamsSchema,
  ListFormsQuerySchema,
  ListApiKeysQuerySchema,
  ListWebhooksQuerySchema,
} from './admin.validators';

const router = Router();

// Apply global admin middleware to all routes in this router
router.use(requireAuth, requireAdmin);

router.get('/stats', adminController.getStats);

router.get('/users', validate({ query: UserListQuerySchema }), adminController.listUsers);

router.get('/users/:userId', validate({ params: UserIdParamsSchema }), adminController.getUser);

router.post(
  '/users/:userId/verify-email',
  validate({ params: UserIdParamsSchema, body: VerifyEmailSchema }),
  adminController.verifyEmail,
);

router.post(
  '/users/:userId/unverify-email',
  validate({ params: UserIdParamsSchema, body: VerifyEmailSchema }),
  adminController.unverifyEmail,
);

router.post(
  '/users/:userId/resend-verification',
  validate({ params: UserIdParamsSchema }),
  adminController.resendVerification,
);

router.patch(
  '/users/:userId/plan',
  validate({ params: UserIdParamsSchema, body: ChangeUserPlanSchema }),
  adminController.changePlan,
);

router.post(
  '/users/:userId/suspend',
  validate({ params: UserIdParamsSchema, body: SuspendUserSchema }),
  adminController.suspendUser,
);

router.post(
  '/users/:userId/unsuspend',
  validate({ params: UserIdParamsSchema, body: UnsuspendUserSchema }),
  adminController.unsuspendUser,
);

router.post(
  '/users/:userId/revoke-sessions',
  validate({ params: UserIdParamsSchema, body: SuspendUserSchema }),
  adminController.revokeAllSessions,
);

router.get(
  '/users/:userId/forms',
  validate({ params: UserIdParamsSchema, query: ListFormsQuerySchema }),
  adminController.getUserForms,
);

router.get(
  '/users/:userId/api-keys',
  validate({ params: UserIdParamsSchema }),
  adminController.getUserApiKeys,
);

router.get(
  '/users/:userId/webhooks',
  validate({ params: UserIdParamsSchema }),
  adminController.getUserWebhooks,
);

router.get('/forms', validate({ query: ListFormsQuerySchema }), adminController.listForms);

router.get('/api-keys', validate({ query: ListApiKeysQuerySchema }), adminController.listApiKeys);

router.get('/webhooks/failed', validate({ query: ListWebhooksQuerySchema }), adminController.listFailedWebhooks);

router.post(
  '/api-keys/:keyId/revoke',
  validate({ params: KeyIdParamsSchema, body: RevokeApiKeySchema }),
  adminController.revokeApiKey,
);

router.post(
  '/webhooks/:webhookId/disable',
  validate({ params: WebhookIdParamsSchema, body: DisableWebhookSchema }),
  adminController.disableWebhook,
);

export { router as adminRoutes };
