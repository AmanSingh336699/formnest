import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { success, noContent } from '../../lib/responseFormatter';
import { isProd } from '../../config/env';
import { UnauthorizedError } from '../../lib/AppError';

const REFRESH_COOKIE_NAME = 'fn_refresh';

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await authService.register({
        email: req.body.email,
        password: req.body.password,
        name: req.body.name,
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      });
      setRefreshCookie(res, session.refreshToken);
      success(
        res,
        {
          user: session.user,
          accessToken: session.accessToken,
          expiresInSec: session.expiresInSec,
        },
        { requestId: req.requestId },
        201,
      );
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await authService.login({
        email: req.body.email,
        password: req.body.password,
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      });
      setRefreshCookie(res, session.refreshToken);
      success(res, {
        user: session.user,
        accessToken: session.accessToken,
        expiresInSec: session.expiresInSec,
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME];
      if (!refreshToken) throw new UnauthorizedError('Refresh token missing', 'TOKEN_INVALID');

      const session = await authService.refresh({
        refreshToken,
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      });
      setRefreshCookie(res, session.refreshToken);
      success(res, {
        user: session.user,
        accessToken: session.accessToken,
        expiresInSec: session.expiresInSec,
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME];
      if (refreshToken) await authService.logout(refreshToken);
      clearRefreshCookie(res);
      noContent(res);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if ('token' in req.body) {
        await authService.verifyEmail(req.body.token);
      } else {
        await authService.verifyEmailOtp(req.body.email, req.body.otp);
      }
      success(res, { verified: true });
    } catch (err) {
      next(err);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resendVerification(req.body.email);
      success(res, { sent: true });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.forgotPassword(req.body.email);
      success(res, { sent: true });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      success(res, { reset: true });
    } catch (err) {
      next(err);
    }
  },
};
