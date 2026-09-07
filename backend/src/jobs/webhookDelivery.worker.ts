/**
 * Webhook delivery worker. Reads from BullMQ, dispatches HTTP POST with HMAC signature.
 * Updates webhook_deliveries row + handles retry scheduling + auto-disable.
 *
 * Retry strategy: WEBHOOK_CONFIG.retryDelaysSec
 * Auto-disable: after WEBHOOK_CONFIG.autoDisableAfterConsecutiveFailures consecutive failures.
 */
import { Worker, type Job } from 'bullmq';
import { eq, sql } from 'drizzle-orm';
import { db } from '../config/database';
import { queueRedis } from '../config/redis';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { QUEUE_NAMES, type WebhookJobData, webhookQueue } from '../config/queue';
import { webhooks, webhookDeliveries } from '../../drizzle/schema/webhooks';
import { signWebhookPayload, decryptSecret } from '../lib/hmac';
import { WEBHOOK_CONFIG } from '../lib/constants';
import { emailQueue } from '../config/queue';
import { users } from '../../drizzle/schema/users';

interface DeliveryResult {
  status: number | null;
  body: string;
  durationMs: number;
  error?: string;
}

async function dispatch(url: string, body: string, signature: string): Promise<DeliveryResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FormNest-Webhook/1.0',
        'X-FormNest-Signature': signature,
      },
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    const truncated = text.slice(0, WEBHOOK_CONFIG.responseBodyMaxBytes);
    return { status: res.status, body: truncated, durationMs: Date.now() - start };
  } catch (err) {
    return {
      status: null,
      body: '',
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function processJob(job: Job<WebhookJobData>): Promise<void> {
  const { deliveryId, webhookId } = job.data;

  const [delivery] = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.id, deliveryId)).limit(1);
  if (!delivery) {
    logger.warn({ deliveryId }, 'Delivery row missing, skipping');
    return;
  }

  const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
  if (!webhook || !webhook.isActive) {
    await db
      .update(webhookDeliveries)
      .set({ status: 'DEAD', errorMessage: 'Webhook inactive or deleted', completedAt: new Date() })
      .where(eq(webhookDeliveries.id, deliveryId));
    return;
  }

  const payloadString = JSON.stringify(delivery.payload);
  const secret = decryptSecret(webhook.secretEncrypted, env.WEBHOOK_HMAC_SECRET);
  const signature = signWebhookPayload(secret, payloadString);

  const result = await dispatch(webhook.url, payloadString, signature);
  const success = result.status !== null && result.status >= 200 && result.status < 300;

  if (success) {
    await db.transaction(async (tx) => {
      await tx
        .update(webhookDeliveries)
        .set({
          status: 'SUCCESS',
          httpStatus: result.status,
          responseBody: result.body,
          durationMs: result.durationMs,
          completedAt: new Date(),
          errorMessage: null,
        })
        .where(eq(webhookDeliveries.id, deliveryId));
      await tx
        .update(webhooks)
        .set({ failureCount: 0, lastSuccessAt: new Date() })
        .where(eq(webhooks.id, webhookId));
    });
    logger.info({ deliveryId, webhookId, status: result.status }, 'Webhook delivered');
    return;
  }

  // Failure handling
  const currentAttempt = delivery.attempt;
  const nextAttempt = currentAttempt + 1;
  const newConsecutiveFailures = webhook.failureCount + 1;

  if (nextAttempt > WEBHOOK_CONFIG.maxAttempts) {
    await db.transaction(async (tx) => {
      await tx
        .update(webhookDeliveries)
        .set({
          status: 'DEAD',
          httpStatus: result.status,
          responseBody: result.body,
          durationMs: result.durationMs,
          completedAt: new Date(),
          errorMessage: result.error ?? null,
        })
        .where(eq(webhookDeliveries.id, deliveryId));

      const shouldAutoDisable = newConsecutiveFailures >= WEBHOOK_CONFIG.autoDisableAfterConsecutiveFailures;
      await tx
        .update(webhooks)
        .set({
          failureCount: newConsecutiveFailures,
          lastFailureAt: new Date(),
          isActive: shouldAutoDisable ? false : webhook.isActive,
          autoDisabledAt: shouldAutoDisable ? new Date() : webhook.autoDisabledAt,
        })
        .where(eq(webhooks.id, webhookId));
    });

    // Send notification email if we crossed the threshold
    if (newConsecutiveFailures === WEBHOOK_CONFIG.notifyAfterConsecutiveFailures) {
      const [owner] = await db.select().from(users).where(eq(users.id, webhook.userId)).limit(1);
      if (owner) {
        await emailQueue.add('webhook-failed', {
          to: owner.email,
          subject: 'Your FormNest webhook is failing',
          template: 'webhookFailed',
          variables: { name: owner.name, webhookUrl: webhook.url, failureCount: newConsecutiveFailures },
        });
      }
    }
    return;
  }

  // Schedule retry
  const delaySec = WEBHOOK_CONFIG.retryDelaysSec[currentAttempt] ?? WEBHOOK_CONFIG.retryDelaysSec[WEBHOOK_CONFIG.retryDelaysSec.length - 1] ?? 60;
  const jitter = Math.floor(Math.random() * 5);
  const finalDelay = (delaySec + jitter) * 1000;

  await db.transaction(async (tx) => {
    await tx
      .update(webhookDeliveries)
      .set({
        status: 'FAILED',
        httpStatus: result.status,
        responseBody: result.body,
        durationMs: result.durationMs,
        errorMessage: result.error ?? null,
        attempt: nextAttempt,
        nextRetryAt: new Date(Date.now() + finalDelay),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    await tx
      .update(webhooks)
      .set({ failureCount: newConsecutiveFailures, lastFailureAt: new Date() })
      .where(eq(webhooks.id, webhookId));
  });

  await webhookQueue.add(
    'deliver',
    { ...job.data, attempt: nextAttempt },
    { delay: finalDelay },
  );
}

export function startWebhookWorker(): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>(
    QUEUE_NAMES.WEBHOOK,
    async (job) => processJob(job),
    {
      connection: queueRedis,
      concurrency: 20,
      drainDelay: 30,
      removeOnComplete: { age: 24 * 3600, count: 1000 },
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Webhook worker job failed');
  });
  worker.on('ready', () => logger.info('Webhook worker ready'));
  return worker;
}

// Suppress unused
void sql;
