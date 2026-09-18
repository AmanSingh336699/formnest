import { Queue } from 'bullmq';
import { queueRedis } from './redis';
import { logger } from './logger';
import type { EmailJobData } from '../lib/emailTemplates';

export type { EmailJobData } from '../lib/emailTemplates';

export const QUEUE_NAMES = {
  EMAIL: 'email-dispatch',
} as const;

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  connection: queueRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

export async function closeQueues(): Promise<void> {
  logger.info('Closing queues...');
  await emailQueue.close();
}
