import type { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { success } from '../../lib/responseFormatter';
import { UnauthorizedError } from '../../lib/AppError';

function getAdminId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

function getCtx(req: Request) {
  return {
    ip: req.ip ?? null,
    ua: req.headers['user-agent'] ?? null,
  };
}

export const adminController = {
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getDashboardStats();
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.listUsers(req.query as any);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getUserDetail(req.params.userId!);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = getAdminId(req);
      const { reason } = req.body;
      await adminService.verifyEmail(adminId, req.params.userId!, reason, getCtx(req));
      success(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async unverifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = getAdminId(req);
      const { reason } = req.body;
      await adminService.unverifyEmail(adminId, req.params.userId!, reason, getCtx(req));
      success(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = getAdminId(req);
      await adminService.resendVerification(adminId, req.params.userId!, getCtx(req));
      success(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async changePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = getAdminId(req);
      const { plan, planValidUntil, reason } = req.body;
      await adminService.changePlan(adminId, req.params.userId!, plan, planValidUntil, reason, getCtx(req));
      success(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = getAdminId(req);
      const { reason } = req.body;
      await adminService.suspendUser(adminId, req.params.userId!, reason, getCtx(req));
      success(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async unsuspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = getAdminId(req);
      const { reason } = req.body;
      await adminService.unsuspendUser(adminId, req.params.userId!, reason, getCtx(req));
      success(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async revokeAllSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = getAdminId(req);
      const { reason } = req.body;
      await adminService.revokeAllSessions(adminId, req.params.userId!, reason, getCtx(req));
      success(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async getUserForms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const data = await adminService.getUserForms(req.params.userId!, page, limit);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getUserApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getUserApiKeys(req.params.userId!);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getUserWebhooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getUserWebhooks(req.params.userId!);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = getAdminId(req);
      const { reason } = req.body;
      await adminService.revokeApiKey(adminId, req.params.keyId!, reason, getCtx(req));
      success(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async disableWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = getAdminId(req);
      const { reason } = req.body;
      await adminService.disableWebhook(adminId, req.params.webhookId!, reason, getCtx(req));
      success(res, { success: true });
    } catch (err) {
      next(err);
    }
  },

  async listForms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.listAllForms(req.query as any);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.listAllApiKeys(req.query as any);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },

  async listFailedWebhooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.listFailedWebhooks(req.query as any);
      success(res, data);
    } catch (err) {
      next(err);
    }
  },
};
