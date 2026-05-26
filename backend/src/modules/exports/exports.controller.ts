import type { Request, Response, NextFunction } from 'express';
import { exportsService } from './exports.service';
import { UnauthorizedError, ValidationError } from '../../lib/AppError';

export const exportsController = {
  async csv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const formId = req.params.id;
      if (!formId) throw new ValidationError();
      const includeSpam = String(req.query.includeSpam ?? 'false') === 'true';
      const { filename, csv } = await exportsService.exportFormCsv(req.user, formId, { includeSpam });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  },
};
