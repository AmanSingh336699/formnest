/**
 * Webhooks service. CRUD + test + delivery log queries.
 * Secret stored AES-GCM encrypted; never returned in plaintext after creation.
 */
import crypto from 'node:crypto';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { forms } from '../../../drizzle/schema/forms';
import { webhooks, webhookDeliveries, type Webhook, type WebhookDelivery } from '../../../drizzle/schema/webhooks';
import { encryptSecret } from '../../lib/hmac';
import { env } from '../../config/env';
import { webhookQueue } from '../../config/queue';
import { NotFoundError, ForbiddenError, PaymentRequiredError } from '../../lib/AppError';
import { PLAN_LIMITS } from '../../lib/constants';
import { recordAudit } from '../../lib/auditLog';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';

async function assertFormOwnership(formId: string, userId: string): Promise<void> {
  const [row] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.userId, userId)))
    .limit(1);
  if (!row) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');
}

export interface WebhookWithSecret extends Webhook {
  rawSecret?: string; // ONLY returned on create
}

export const webhooksService = {
  async list(user: AuthenticatedUser, formId: string): Promise<Webhook[]> {
    await assertFormOwnership(formId, user.id);
    return db.select().from(webhooks).where(eq(webhooks.formId, formId)).orderBy(desc(webhooks.createdAt));
  },

  async create(
    user: AuthenticatedUser,
    formId: string,
    body: { url: string; events: string[] },
    ctx: { ip: string | null; ua: string | null },
  ): Promise<WebhookWithSecret> {
    await assertFormOwnership(formId, user.id);

    const limits = PLAN_LIMITS[user.plan];
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(webhooks)
      .where(eq(webhooks.formId, formId));
    const count = result[0]?.count ?? 0;
    if (count >= limits.maxWebhooksPerForm) {
      throw new PaymentRequiredError(
        `Your plan allows ${limits.maxWebhooksPerForm} webhook(s) per form. Upgrade for more.`,
        'WEBHOOK_LIMIT_REACHED',
      );
    }

    const rawSecret = `whsec_${crypto.randomBytes(32).toString('base64url')}`;
    const secretEncrypted = encryptSecret(rawSecret, env.WEBHOOK_HMAC_SECRET);

    const [created] = await db
      .insert(webhooks)
      .values({
        formId,
        userId: user.id,
        url: body.url,
        secretEncrypted,
        events: body.events,
        isActive: true,
      })
      .returning();
    if (!created) throw new Error('Failed to create webhook');

    await recordAudit({
      userId: user.id,
      entityType: 'webhook',
      entityId: created.id,
      action: 'CREATE',
      diff: { url: body.url, events: body.events },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return { ...created, rawSecret };
  },

  async update(
    user: AuthenticatedUser,
    webhookId: string,
    body: { url?: string; events?: string[]; isActive?: boolean },
    ctx: { ip: string | null; ua: string | null },
  ): Promise<Webhook> {
    const [existing] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
    if (!existing) throw new NotFoundError('Webhook not found');
    if (existing.userId !== user.id) throw new ForbiddenError();

    const update: Partial<Webhook> = { updatedAt: new Date() };
    if (body.url !== undefined) update.url = body.url;
    if (body.events !== undefined) update.events = body.events;
    if (body.isActive !== undefined) {
      update.isActive = body.isActive;
      if (body.isActive) {
        update.failureCount = 0;
        update.autoDisabledAt = null;
      }
    }

    const [updated] = await db.update(webhooks).set(update).where(eq(webhooks.id, webhookId)).returning();
    if (!updated) throw new NotFoundError('Webhook not found');

    await recordAudit({
      userId: user.id,
      entityType: 'webhook',
      entityId: webhookId,
      action: 'UPDATE',
      diff: body,
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return updated;
  },

  async delete(user: AuthenticatedUser, webhookId: string, ctx: { ip: string | null; ua: string | null }): Promise<void> {
    const [existing] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
    if (!existing) throw new NotFoundError('Webhook not found');
    if (existing.userId !== user.id) throw new ForbiddenError();

    await db.delete(webhooks).where(eq(webhooks.id, webhookId));
    await recordAudit({
      userId: user.id,
      entityType: 'webhook',
      entityId: webhookId,
      action: 'DELETE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async sendTest(user: AuthenticatedUser, webhookId: string): Promise<{ deliveryId: string }> {
    const [existing] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
    if (!existing) throw new NotFoundError('Webhook not found');
    if (existing.userId !== user.id) throw new ForbiddenError();

    const payload = {
      id: `test_${crypto.randomBytes(8).toString('hex')}`,
      event: 'test.event',
      createdAt: new Date().toISOString(),
      data: { message: 'This is a test webhook from FormNest', formId: existing.formId },
    };

    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: existing.id,
        responseId: null,
        eventType: 'test.event',
        payload,
        status: 'PENDING',
        attempt: 1,
        nextRetryAt: new Date(),
      })
      .returning({ id: webhookDeliveries.id });

    if (!delivery) throw new Error('Failed to create test delivery');

    await webhookQueue.add('deliver', {
      deliveryId: delivery.id,
      webhookId: existing.id,
      responseId: null,
      eventType: 'test.event',
      payload,
      attempt: 1,
    });

    await recordAudit({
      userId: user.id,
      entityType: 'webhook',
      entityId: webhookId,
      action: 'WEBHOOK_TEST',
    });

    return { deliveryId: delivery.id };
  },

  async listDeliveries(
    user: AuthenticatedUser,
    webhookId: string,
    params: { page: number; limit: number; status?: WebhookDelivery['status'] },
  ): Promise<{ items: WebhookDelivery[]; total: number }> {
    const [wh] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
    if (!wh) throw new NotFoundError('Webhook not found');
    if (wh.userId !== user.id) throw new ForbiddenError();

    const conditions = [eq(webhookDeliveries.webhookId, webhookId)];
    if (params.status) conditions.push(eq(webhookDeliveries.status, params.status));
    const where = and(...conditions);

    const offset = (params.page - 1) * params.limit;
    const [items, totalRow] = await Promise.all([
      db
        .select()
        .from(webhookDeliveries)
        .where(where)
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(params.limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(webhookDeliveries).where(where),
    ]);

    return { items, total: totalRow[0]?.count ?? 0 };
  },

  async retryDelivery(user: AuthenticatedUser, webhookId: string, deliveryId: string): Promise<void> {
    const [wh] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
    if (!wh) throw new NotFoundError('Webhook not found');
    if (wh.userId !== user.id) throw new ForbiddenError();

    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.webhookId, webhookId)))
      .limit(1);
    if (!delivery) throw new NotFoundError('Delivery not found');

    await db
      .update(webhookDeliveries)
      .set({ status: 'PENDING', attempt: delivery.attempt + 1, nextRetryAt: new Date() })
      .where(eq(webhookDeliveries.id, deliveryId));

    await webhookQueue.add('deliver', {
      deliveryId,
      webhookId,
      responseId: delivery.responseId,
      eventType: delivery.eventType,
      payload: { ref: deliveryId },
      attempt: delivery.attempt + 1,
    });
  },
};
