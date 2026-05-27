/**
 * Express application composition. No listening here — that's server.ts.
 */
import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { logger } from './config/logger';
import { checkDatabaseHealth } from './config/database';
import { checkRedisHealth } from './config/redis';

import { requestIdMiddleware } from './middleware/requestId.middleware';
import { requestLoggerMiddleware } from './middleware/requestLogger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/notFound.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';

import { authRoutes } from './modules/auth/auth.routes';
import { formsRoutes } from './modules/forms/forms.routes';
import {
  responseFormSubRoutes,
  responseSingleRoutes,
} from './modules/responses/responses.routes';
import {
  webhookFormSubRoutes,
  webhookSingleRoutes,
} from './modules/webhooks/webhooks.routes';
import { publicRoutes } from './modules/public/public.routes';
import { apiKeysRoutes } from './modules/apiKeys/apiKeys.routes';
import { usersRoutes } from './modules/users/users.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { exportsRoutes } from './modules/exports/exports.routes';
import { teamsRoutes } from './modules/teams/teams.routes';
import { billingRoutes, billingWebhookRoutes } from './modules/billing/billing.routes';
import { filesRoutes } from './modules/notifications/files.routes';

import { generateOpenApiDocument } from './openapi/registry';
import { success } from './lib/responseFormatter';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
      exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    }),
  );
  app.use(compression());

  // Stripe webhook MUST be mounted BEFORE express.json (needs raw body)
  app.use('/api/v1/billing', billingWebhookRoutes);

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Health
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/health/ready', async (_req, res) => {
    const [db, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);
    const ready = db;
    res.status(ready ? 200 : 503).json({
      status: ready && redis ? 'ok' : ready ? 'degraded' : 'down',
      checks: { db, redis },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/version', (_req, res) => res.json({ version: '1.0.0', env: env.NODE_ENV }));

  app.get('/api/v1/openapi.json', (_req, res) => {
    res.json(generateOpenApiDocument());
  });

  // Public (unauthenticated)
  app.use('/api/v1/public', publicRoutes);

  // Auth
  app.use('/api/v1/auth', authRoutes);

  // Authenticated APIs
  app.use('/api/v1', apiRateLimiter);

  app.use('/api/v1/forms', formsRoutes);
  app.use('/api/v1/forms', responseFormSubRoutes);
  app.use('/api/v1/forms', webhookFormSubRoutes);
  app.use('/api/v1', exportsRoutes);
  app.use('/api/v1', analyticsRoutes);
  app.use('/api/v1/responses', responseSingleRoutes);
  app.use('/api/v1/webhooks', webhookSingleRoutes);
  app.use('/api/v1/api-keys', apiKeysRoutes);
  app.use('/api/v1/me', usersRoutes);
  app.use('/api/v1/teams', teamsRoutes);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api/v1/files', filesRoutes);

  app.get('/', (_req, res) => success(res, { name: 'FormNest API', version: '1.0.0' }));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  logger.info('Express app composed');
  return app;
}
