import { Router } from 'express';
import express from 'express';
import { billingController } from './billing.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const authedRouter = Router();
authedRouter.use(requireAuth);
authedRouter.post('/checkout', billingController.checkout);
authedRouter.post('/portal', billingController.portal);

const webhookRouter = Router();
// Stripe needs raw body for signature verification
webhookRouter.post('/webhook', express.raw({ type: 'application/json' }), billingController.webhook);

export const billingRoutes = authedRouter;
export const billingWebhookRoutes = webhookRouter;
