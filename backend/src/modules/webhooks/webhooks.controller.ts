import type { Request, Response, NextFunction } from 'express';
import { webhooksService } from './webhooks.service';
import { success, created, noContent } from '../../lib/responseFormatter';
import { UnauthorizedError, ValidationError } from '../../lib/AppError';

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export const webhooksController = {
  async listForForm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const items = await webhooksService.list(user, id);
      success(res, items);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const wh = await webhooksService.create(user, id, req.body, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      created(res, {
        id: wh.id,
        url: wh.url,
        events: wh.events,
        isActive: wh.isActive,
        secret: wh.rawSecret,
        createdAt: wh.createdAt,
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const wh = await webhooksService.update(user, id, req.body, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      success(res, wh);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      await webhooksService.delete(user, id, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      noContent(res);
    } catch (err) {
      next(err);
    }
  },

  async test(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const result = await webhooksService.sendTest(user, id);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async listDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const q = req.query as unknown as { page: number; limit: number; status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'DEAD' };
      const { items, total } = await webhooksService.listDeliveries(user, id, q);
      success(res, items, { total, page: q.page, limit: q.limit });
    } catch (err) {
      next(err);
    }
  },

  async retryDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      const deliveryId = req.params.deliveryId;
      if (!id || !deliveryId) throw new ValidationError();
      await webhooksService.retryDelivery(user, id, deliveryId);
      success(res, { queued: true });
    } catch (err) {
      next(err);
    }
  },
};
