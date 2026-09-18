import { Queue } from 'bullmq';
import { queueRedis } from './redis';
import { logger } from './logger';
import type { EmailJobData } from '../lib/emailTemplates';

export type { EmailJobData } from '../lib/emailTemplates';

export const QUEUE_NAMES = {
  WEBHOOK: 'webhook-delivery',
  EMAIL: 'email-dispatch',
} as const;

export interface WebhookJobData {
  deliveryId: string;
  webhookId: string;
  responseId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  attempt: number;
}

export const webhookQueue = new Queue<WebhookJobData>(QUEUE_NAMES.WEBHOOK, {
  connection: queueRedis,
  defaultJobOptions: {
    attempts: 1, // we manage retries manually via DB scheduling
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

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
  await Promise.all([
    webhookQueue.close(),
    emailQueue.close(),
  ]);
}
