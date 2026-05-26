import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { teamsService } from './teams.service';
import { success, created, noContent } from '../../lib/responseFormatter';
import { UnauthorizedError, ValidationError } from '../../lib/AppError';

const CreateTeamSchema = z.object({ name: z.string().min(1).max(100) }).strict();
const InviteSchema = z.object({ email: z.string().email().max(255) }).strict();
const AcceptSchema = z.object({ token: z.string().min(20).max(200) }).strict();

function requireUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export const teamsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const items = await teamsService.listForUser(user.id);
      success(res, items);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const body = CreateTeamSchema.parse(req.body);
      const team = await teamsService.create(user, body.name, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      created(res, team);
    } catch (err) {
      next(err);
    }
  },

  async members(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const items = await teamsService.getMembers(user, id);
      success(res, items);
    } catch (err) {
      next(err);
    }
  },

  async invite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const body = InviteSchema.parse(req.body);
      const m = await teamsService.invite(user, id, body.email, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      created(res, m);
    } catch (err) {
      next(err);
    }
  },

  async accept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const body = AcceptSchema.parse(req.body);
      const result = await teamsService.acceptInvitation(user, body.token);
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = req.params.id;
      const userId = req.params.userId;
      if (!id || !userId) throw new ValidationError();
      await teamsService.removeMember(user, id, userId, {
        ip: req.ip ?? null,
        ua: req.headers['user-agent'] ?? null,
      });
      noContent(res);
    } catch (err) {
      next(err);
    }
  },
};
