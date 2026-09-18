import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/AppError';


export function requirePlan(minPlan: 'PRO' | 'ENTERPRISE') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    const order = { FREE: 0, PRO: 1, ENTERPRISE: 2 } as const;
    if (order[req.user.plan] < order[minPlan]) {
      next(new ForbiddenError(`This feature requires the ${minPlan} plan`, 'PLAN_REQUIRED'));
      return;
    }
    next();
  };
}
