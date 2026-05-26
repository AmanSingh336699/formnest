import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { billingService } from './billing.service';
import { success } from '../../lib/responseFormatter';
import { UnauthorizedError, ValidationError } from '../../lib/AppError';

const CheckoutSchema = z
  .object({
    plan: z.enum(['PRO', 'ENTERPRISE']),
    interval: z.enum(['monthly', 'yearly']),
  })
  .strict();

export const billingController = {
  async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const body = CheckoutSchema.parse(req.body);
      const result = await billingService.createCheckoutSession(req.user, body.plan, body.interval);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async portal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await billingService.createPortalSession(req.user);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'];
      if (typeof signature !== 'string') throw new ValidationError('Missing stripe-signature header');
      // req.body is a Buffer because we used express.raw for this route
      await billingService.handleWebhook(req.body as Buffer, signature);
      res.status(200).json({ received: true });
    } catch (err) {
      next(err);
    }
  },
};
