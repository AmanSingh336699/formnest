import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { closeDatabase } from './config/database';
import { closeRedis } from './config/redis';
import { closeQueues } from './config/queue';
import { startEmailWorker } from './jobs/emailDispatch.worker';

async function main(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);

  const emailWorker = startEmailWorker();

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'FormNest API listening');
  });

  let isShuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown initiated');

    httpServer.close(() => logger.info('HTTP server closed'));
    await new Promise((r) => setTimeout(r, 2000));

    try {
      await Promise.allSettled([emailWorker.close()]);
      await Promise.allSettled([closeQueues(), closeDatabase(), closeRedis()]);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    void shutdown('uncaughtException');
  });
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Fatal error starting server');
  process.exit(1);
});
