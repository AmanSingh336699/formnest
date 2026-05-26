import type { Request, Response, NextFunction } from 'express';
import { responsesService } from './responses.service';
import { success, noContent } from '../../lib/responseFormatter';
import { UnauthorizedError, ValidationError } from '../../lib/AppError';

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export const responsesController = {
  async listByForm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const formId = req.params.id;
      if (!formId) throw new ValidationError('Form id required');
      const q = req.query as unknown as {
        page: number;
        limit: number;
        includeSpam: boolean;
        sort: 'createdAt' | '-createdAt';
      };
      const { items, total } = await responsesService.listByForm(user, formId, q);
      success(res, items, { total, page: q.page, limit: q.limit });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const data = await responsesService.getOne(user, id);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      await responsesService.delete(user, id, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      noContent(res);
    } catch (err) {
      next(err);
    }
  },

  async markSpam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const isSpam = Boolean((req.body as { isSpam?: boolean }).isSpam);
      await responsesService.markSpam(user, id, isSpam);
      success(res, { updated: true });
    } catch (err) {
      next(err);
    }
  },
};
