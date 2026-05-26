import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { apiKeysService } from './apiKeys.service';
import { success, created, noContent } from '../../lib/responseFormatter';
import { UnauthorizedError, ValidationError } from '../../lib/AppError';

const CreateApiKeyBodySchema = z.object({ name: z.string().min(1).max(100) }).strict();

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export const apiKeysController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const items = await apiKeysService.list(user);
      success(res, items);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const body = CreateApiKeyBodySchema.parse(req.body);
      const key = await apiKeysService.create(user, body.name, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      created(res, key);
    } catch (err) {
      next(err);
    }
  },

  async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      await apiKeysService.revoke(user, id, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      noContent(res);
    } catch (err) {
      next(err);
    }
  },

  async reveal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const rawKey = await apiKeysService.reveal(user, id);
      success(res, { rawKey });
    } catch (err) {
      next(err);
    }
  },
};
