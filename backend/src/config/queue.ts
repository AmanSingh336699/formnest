/**
 * BullMQ queue factory. Two queues: webhook delivery, email dispatch.
 * Workers live in src/jobs/ and run in a separate process (worker.ts).
 */
import { Queue, QueueEvents } from 'bullmq';
import { queueRedis } from './redis';
import { logger } from './logger';

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

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, unknown>;
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

export const webhookEvents = new QueueEvents(QUEUE_NAMES.WEBHOOK, { connection: queueRedis });
export const emailEvents = new QueueEvents(QUEUE_NAMES.EMAIL, { connection: queueRedis });

webhookEvents.on('failed', ({ jobId, failedReason }) => {
  logger.warn({ jobId, failedReason }, 'Webhook job failed');
});

emailEvents.on('failed', ({ jobId, failedReason }) => {
  logger.warn({ jobId, failedReason }, 'Email job failed');
});

export async function closeQueues(): Promise<void> {
  logger.info('Closing queues...');
  await Promise.all([
    webhookQueue.close(),
    emailQueue.close(),
    webhookEvents.close(),
    emailEvents.close(),
  ]);
}
