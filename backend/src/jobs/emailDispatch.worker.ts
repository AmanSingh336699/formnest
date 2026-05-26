/**
 * Email dispatch worker. Reads from BullMQ, sends via Nodemailer transport.
 */
import { Worker, type Job } from 'bullmq';
import { queueRedis } from '../config/redis';
import { logger } from '../config/logger';
import { QUEUE_NAMES, type EmailJobData } from '../config/queue';
import { sendEmail } from '../config/email';

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job: Job<EmailJobData>) => {
      await sendEmail({
        to: job.data.to,
        subject: job.data.subject,
        template: job.data.template,
        variables: job.data.variables,
      });
    },
    {
      connection: queueRedis,
      concurrency: 10,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Email worker job failed');
  });
  worker.on('ready', () => logger.info('Email worker ready'));
  return worker;
}
