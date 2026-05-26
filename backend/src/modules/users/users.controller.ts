import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { usersService } from './users.service';
import { success, noContent } from '../../lib/responseFormatter';
import { UnauthorizedError } from '../../lib/AppError';

const UpdateProfileSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    locale: z.string().min(2).max(10).optional(),
    timezone: z.string().min(1).max(50).optional(),
    avatarUrl: z.string().url().nullable().optional(),
  })
  .strict();

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(10).max(200),
  })
  .strict();

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export const usersController = {
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const data = await usersService.me(user.id);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const body = UpdateProfileSchema.parse(req.body);
      const data = await usersService.updateProfile(user.id, body);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const body = ChangePasswordSchema.parse(req.body);
      await usersService.changePassword(user.id, body.currentPassword, body.newPassword, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      success(res, { changed: true });
    } catch (err) {
      next(err);
    }
  },

  async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const data = await usersService.exportData(user.id);
      res.setHeader('Content-Disposition', `attachment; filename="formnest-export-${user.id}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(JSON.stringify(data, null, 2));
    } catch (err) {
      next(err);
    }
  },

  async deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      await usersService.deleteAccount(user, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      noContent(res);
    } catch (err) {
      next(err);
    }
  },
};
