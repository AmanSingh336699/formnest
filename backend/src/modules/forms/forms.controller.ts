import type { Request, Response, NextFunction } from 'express';
import { formsService } from './forms.service';
import { success, created, noContent } from '../../lib/responseFormatter';
import { UnauthorizedError } from '../../lib/AppError';

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  return req.user;
}

export const formsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const query = req.query as unknown as { page: number; limit: number; status?: string; search?: string };
      const { items, total } = await formsService.listForUser(user.id, {
        page: query.page,
        limit: query.limit,
        status: query.status,
        search: query.search,
      });
      success(res, items, { total, page: query.page, limit: query.limit });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new UnauthorizedError('Form id required');
      const form = await formsService.getByIdForUser(id, user.id);
      success(res, form);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const form = await formsService.create(user, req.body, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      created(res, form);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new UnauthorizedError('Form id required');

      // Keep UpdateFormBodySchema strict by stripping any extra keys
      // coming from the client (e.g. formId, createdAt, updatedAt).
      const safeBody = {
        ...(req.body?.title !== undefined ? { title: req.body.title } : {}),
        ...(req.body?.description !== undefined ? { description: req.body.description } : {}),
        ...(req.body?.fields !== undefined ? { fields: req.body.fields } : {}),
        ...(req.body?.theme !== undefined ? { theme: req.body.theme } : {}),
        ...(req.body?.settings !== undefined ? { settings: req.body.settings } : {}),
        ...(req.body?.customSlug !== undefined ? { customSlug: req.body.customSlug } : {}),
      };

      const form = await formsService.update(user, id, safeBody, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      success(res, form);
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new UnauthorizedError('Form id required');
      const form = await formsService.publish(user, id, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      success(res, form);
    } catch (err) {
      next(err);
    }
  },

  async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new UnauthorizedError('Form id required');
      const form = await formsService.close(user, id, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      success(res, form);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new UnauthorizedError('Form id required');
      await formsService.delete(user, id, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      noContent(res);
    } catch (err) {
      next(err);
    }
  },

  async duplicate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new UnauthorizedError('Form id required');
      const form = await formsService.duplicate(user, id, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      created(res, form);
    } catch (err) {
      next(err);
    }
  },
};
