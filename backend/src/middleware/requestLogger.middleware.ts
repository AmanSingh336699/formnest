import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { hashIp } from '../lib/ipAnonymize';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;

    const ipHash = hashIp(req.ip);

    logger.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        ipHash,
        userId: req.user?.id,
        ua: req.headers['user-agent'],
      },
      'http_request',
    );
  });

  next();
}
