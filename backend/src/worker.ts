/**
 * Worker process entry point. Runs BullMQ workers for webhooks + emails.
 */
import './config/env';
import { logger } from './config/logger';
import { startWebhookWorker } from './jobs/webhookDelivery.worker';
import { startEmailWorker } from './jobs/emailDispatch.worker';
import { closeDatabase } from './config/database';
import { closeRedis } from './config/redis';
import { closeQueues } from './config/queue';

async function main(): Promise<void> {
  logger.info('Starting FormNest workers...');

  const webhookWorker = startWebhookWorker();
  const emailWorker = startEmailWorker();

  let isShuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, 'Worker shutdown initiated');

    await Promise.allSettled([webhookWorker.close(), emailWorker.close()]);
    await Promise.allSettled([closeQueues(), closeDatabase(), closeRedis()]);
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection in worker');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception in worker');
    void shutdown('uncaughtException');
  });

  logger.info('FormNest workers running');
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Fatal error starting workers');
  process.exit(1);
});
