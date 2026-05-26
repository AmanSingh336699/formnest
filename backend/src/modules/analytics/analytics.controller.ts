import type { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { success } from '../../lib/responseFormatter';
import { UnauthorizedError, ValidationError } from '../../lib/AppError';

export const analyticsController = {
  async forForm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const days = Math.min(30, Math.max(1, Number(req.query.days ?? 7)));
      const data = await analyticsService.forForm(req.user, id, days);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },
};
