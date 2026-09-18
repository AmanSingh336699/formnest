import { z } from 'zod';
import { eq, sql, and, gte } from 'drizzle-orm';
import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import {
  forms,
  formFields,
  type Form,
  type FormField,
  type FieldType,
} from '../../../drizzle/schema/forms';
import { users } from '../../../drizzle/schema/users';
import { createId } from '@paralleldrive/cuid2';
import { generateUploadParams, uploadBufferToCloudinary, CLOUDINARY_MAX_FILE_BYTES } from '../../config/storage';
import { responses, responseAnswers, fileUploads } from '../../../drizzle/schema/responses';
import { webhooks, webhookDeliveries } from '../../../drizzle/schema/webhooks';
import { webhookQueue } from '../../config/queue';
import { emailQueue } from '../../config/queue';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/AppError';
import { hashIp } from '../../lib/ipAnonymize';
import { SUBMIT_GUARDS, PLAN_LIMITS } from '../../lib/constants';
import { sanitizePlainText } from '../../lib/sanitize';
import { formsService } from '../forms/forms.service';
import parsePhoneNumber from 'libphonenumber-js';
import { safeRedis, safeRedisResult, safeRedisWrite } from '../../lib/redisSafe';

interface SubmitContext {
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
}

interface SubmitParams {
  formIdOrSlug: string;
  bySlug: boolean;
  answers: Record<string, unknown>;
  loadedAt?: number;
  submittedAt?: number;
  honeypotValue?: string;
  idempotencyKey?: string;
  ctx: SubmitContext;
}

interface SubmitResult {
  responseId: string;
  redirectUrl: string | null;
  successMessage: string | null;
  branding: boolean;
}

function buildFieldValidator(field: FormField): z.ZodTypeAny {
  const required = field.required;
  const v = field.validation;
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'TEXT_SHORT':
    case 'PASSWORD':
    case 'TEXT_LONG': {
      let s = z.string().max(v?.maxLength ?? (field.type === 'TEXT_LONG' ? 5000 : field.type === 'PASSWORD' ? 1024 : 500));
      if (v?.minLength) s = s.min(v.minLength);
      if (v?.regex) {
        try {
          s = s.regex(new RegExp(v.regex));
        } catch {
          // ignore bad regex silently
        }
      }
      schema = s;
      break;
    }
    case 'EMAIL':
      schema = z.string().email().max(255);
      break;
    case 'NUMBER': {
      let n = z.number();
      if (v?.min !== undefined) n = n.min(v.min);
      if (v?.max !== undefined) n = n.max(v.max);
      if (v?.integerOnly) n = n.int();
      schema = n;
      break;
    }
    case 'PHONE':
      schema = z.string().refine((val) => {
        if (val.startsWith('+')) {
          try {
            const parsed = parsePhoneNumber(val);
            return parsed?.isValid() ?? false;
          } catch {
            return false;
          }
        }
        return /^[0-9\s()\-]{5,20}$/.test(val);
      }, 'Invalid phone number');
      break;
    case 'RADIO':
    case 'DROPDOWN': {
      const choices = field.options?.choices?.map((c) => c.value) ?? [];
      schema = choices.length > 0 ? z.enum(choices as [string, ...string[]]) : z.string();
      break;
    }
    case 'CHECKBOX': {
      const choices = field.options?.choices?.map((c) => c.value) ?? [];
      schema =
        choices.length > 0
          ? z.array(z.enum(choices as [string, ...string[]]))
          : z.array(z.string());
      break;
    }
    case 'DATE':
      schema = z.string().refine((v2) => !Number.isNaN(Date.parse(v2)), 'Invalid date');
      break;
    case 'RATING': {
      const max = field.options?.ratingMax ?? 5;
      schema = z.number().int().min(1).max(max);
      break;
    }
    case 'YES_NO':
      schema = z.boolean();
      break;
    case 'FILE_UPLOAD':
      schema = z.union([
        z.string(),
        z.object({
          fileId: z.string().optional(),
          id: z.string().optional(),
          publicId: z.string().optional(),
          url: z.string().optional(),
          name: z.string().optional(),
          size: z.number().optional(),
        }),
        z.array(z.unknown()),
      ]);
      break;
    case 'HEADING':
    case 'DIVIDER':
      // Non-input fields: always optional, ignored on submit
      return z.unknown().optional();
    default: {
      const _exhaustive: never = field.type;
      throw new Error(`Unknown field type: ${String(_exhaustive)}`);
    }
  }

  if (!required) {
    schema = schema.optional().nullable();
  }
  return schema;
}

function getMonthlyResponseKey(userId: string): string {
  const now = new Date();
  const yyyymm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `quota:responses:${userId}:${yyyymm}`;
}

export const publicService = {
  async getPublicForm(slug: string): Promise<Form & { fields: FormField[] }> {
    const form = await formsService.getPublicBySlug(slug);
    if (!form) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');
    return form;
  },

  async trackView(formId: string, ip: string | null): Promise<void> {
    const ipHash = hashIp(ip ?? '');
    const debounceKey = `view:debounce:${formId}:${ipHash}`;
    const fresh = await safeRedisResult('view:debounce:set', () =>
      redis.set(debounceKey, '1', 'EX', SUBMIT_GUARDS.viewDebounceSec, 'NX'),
    );
    if (fresh.ok && !fresh.value) return; // already counted this IP recently

    // Increment in DB (atomic). Cheap because PK lookup.
    await db
      .update(forms)
      .set({ totalViews: sql`${forms.totalViews} + 1` })
      .where(eq(forms.id, formId))
      .catch((err: unknown) => logger.warn({ err, formId }, 'Failed to increment views'));

    // Track per-day for analytics chart
    const dayKey = `analytics:${formId}:${new Date().toISOString().slice(0, 10)}:views`;
    await safeRedisWrite('analytics:views:incr', () => redis.incr(dayKey));
    await safeRedisWrite('analytics:views:expire', () => redis.expire(dayKey, 8 * 24 * 60 * 60));
  },

  async trackStart(formId: string, ip: string | null): Promise<void> {
    const ipHash = hashIp(ip ?? '');
    const debounceKey = `start:debounce:${formId}:${ipHash}`;
    const fresh = await safeRedisResult('start:debounce:set', () =>
      redis.set(debounceKey, '1', 'EX', SUBMIT_GUARDS.viewDebounceSec, 'NX'),
    );
    if (fresh.ok && !fresh.value) return;

    await db
      .update(forms)
      .set({ totalStarts: sql`${forms.totalStarts} + 1` })
      .where(eq(forms.id, formId))
      .catch((err: unknown) => logger.warn({ err, formId }, 'Failed to increment starts'));
  },

  async submit(params: SubmitParams): Promise<SubmitResult> {
    // 1. Resolve form
    const form = params.bySlug
      ? await formsService.getPublicBySlug(params.formIdOrSlug)
      : await this.loadFormById(params.formIdOrSlug);
    if (!form) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');
    if (form.status !== 'PUBLISHED') {
      if (form.status === 'CLOSED') throw new ForbiddenError('This form is closed', 'FORM_CLOSED');
      throw new ForbiddenError('This form is not accepting responses', 'FORM_NOT_PUBLISHED');
    }

    // 2. maxResponses check (form-level setting)
    const maxResponses = form.settings?.maxResponses;
    if (maxResponses && form.totalResponses >= maxResponses) {
      throw new ForbiddenError(
        form.settings?.limitReachedMessage ?? 'This form has reached its response limit',
        'RESPONSE_LIMIT_REACHED',
      );
    }

    // 3. Plan-level monthly quota
    const quotaKey = getMonthlyResponseKey(form.userId);
    const plan = await this.getOwnerPlan(form.userId);
    const currentMonthly = await this.getMonthlyResponseCount(form.userId, quotaKey);
    const monthlyLimit = PLAN_LIMITS[plan].maxResponsesPerMonth;
    if (currentMonthly >= monthlyLimit) {
      throw new ForbiddenError(
        'The owner of this form has reached their monthly response quota',
        'RESPONSE_LIMIT_REACHED',
      );
    }

    // 4. Spam: honeypot
    let isSpam = false;
    let spamReason: string | null = null;
    if (params.honeypotValue && params.honeypotValue.length > 0) {
      isSpam = true;
      spamReason = 'honeypot_filled';
    }

    // 5. Spam: time-trap
    let completionTimeMs: number | null = null;
    if (params.loadedAt && params.submittedAt) {
      completionTimeMs = params.submittedAt - params.loadedAt;
      if (completionTimeMs < SUBMIT_GUARDS.minSubmitTimeMs) {
        isSpam = true;
        spamReason = spamReason ?? 'submitted_too_fast';
      }
    }

    // 6. Validate answers against current schema
    const validated = await this.validateAnswers(form.fields, params.answers);

    // 7. Persist + enqueue webhooks in single transaction (outbox)
    const result = await db.transaction(async (tx) => {
      const [response] = await tx
        .insert(responses)
        .values({
          formId: form.id,
          submitterIpHash: hashIp(params.ctx.ip ?? ''),
          userAgent: params.ctx.userAgent ?? null,
          referrer: params.ctx.referrer ?? null,
          completionTimeMs,
          isSpam,
          spamReason,
        })
        .returning();

      if (!response) throw new Error('Failed to insert response');

      if (validated.length > 0) {
        await tx.insert(responseAnswers).values(
          validated.map((v) => ({
            responseId: response.id,
            fieldId: v.fieldId,
            fieldType: v.fieldType,
            value: v.value,
          })),
        );
      }

      if (!isSpam) {
        await tx
          .update(forms)
          .set({
            totalResponses: sql`${forms.totalResponses} + 1`,
          })
          .where(eq(forms.id, form.id));
      }

      // Outbox: enqueue webhook deliveries inside the same transaction
      const activeWebhooks = await tx
        .select()
        .from(webhooks)
        .where(and(eq(webhooks.formId, form.id), eq(webhooks.isActive, true)));

      const queuedDeliveries: Array<{ deliveryId: string; webhookId: string }> = [];
      if (!isSpam && activeWebhooks.length > 0) {
        const payload = this.buildResponsePayload(response.id, form, validated);
        for (const wh of activeWebhooks) {
          if (!wh.events.includes('response.created')) continue;
          const [delivery] = await tx
            .insert(webhookDeliveries)
            .values({
              webhookId: wh.id,
              responseId: response.id,
              eventType: 'response.created',
              payload,
              status: 'PENDING',
              attempt: 1,
              nextRetryAt: new Date(),
            })
            .returning({ id: webhookDeliveries.id });
          if (delivery) queuedDeliveries.push({ deliveryId: delivery.id, webhookId: wh.id });
        }
      }

      return { response, queuedDeliveries };
    });

    // Update monthly counter (best effort)
    if (!isSpam) {
      await safeRedisWrite('quota:responses:incr', () => redis.incr(quotaKey));
      await safeRedisWrite('quota:responses:expire', () => redis.expire(quotaKey, 35 * 24 * 60 * 60));

      const dayKey = `analytics:${form.id}:${new Date().toISOString().slice(0, 10)}:completions`;
      await safeRedisWrite('analytics:completions:incr', () => redis.incr(dayKey));
      await safeRedisWrite('analytics:completions:expire', () => redis.expire(dayKey, 8 * 24 * 60 * 60));
    }

    // Enqueue webhook jobs (outside transaction)
    for (const d of result.queuedDeliveries) {
      await webhookQueue
        .add('deliver', {
          deliveryId: d.deliveryId,
          webhookId: d.webhookId,
          responseId: result.response.id,
          eventType: 'response.created',
          payload: { ref: d.deliveryId },
          attempt: 1,
        })
        .catch((err: unknown) => logger.warn({ err, deliveryId: d.deliveryId }, 'Webhook queue unavailable'));
    }

    // Enqueue email notification if configured
    if (!isSpam && form.settings?.notifyOnResponse) {
      const emails = await this.getNotificationEmails(form);
      for (const to of emails) {
        await emailQueue
          .add('response-received', {
            to,
            subject: `New response on "${form.title}"`,
            template: 'responseReceived',
            variables: {
              formTitle: form.title,
              responseLink: `${env.FRONTEND_URL}/dashboard/forms/${form.id}/responses/${result.response.id}`,
            },
          })
          .catch((err: unknown) => logger.warn({ err, formId: form.id, to }, 'Email queue unavailable'));
      }
    }

    return {
      responseId: result.response.id,
      redirectUrl: form.settings?.redirectUrl ?? null,
      successMessage: form.settings?.successMessage ?? null,
      branding: !PLAN_LIMITS[plan].removeBranding,
    };
  },

  async loadFormById(formId: string): Promise<(Form & { fields: FormField[] }) | null> {
    const [form] = await db.select().from(forms).where(eq(forms.id, formId)).limit(1);
    if (!form) return null;
    const fields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, formId))
      .orderBy(formFields.position);
    return { ...form, fields };
  },

  async getOwnerPlan(userId: string): Promise<'FREE' | 'PRO' | 'ENTERPRISE'> {
    const [row] = await db
      .select({ plan: sql<'FREE' | 'PRO' | 'ENTERPRISE'>`plan` })
      .from(sql`users`)
      .where(sql`id = ${userId}`)
      .limit(1);
    return row?.plan ?? 'FREE';
  },

  async getNotificationEmails(form: Form): Promise<string[]> {
    const configured = form.settings?.notifyEmails?.map((email) => email.trim().toLowerCase()).filter(Boolean) ?? [];
    if (configured.length > 0) return Array.from(new Set(configured));

    const [owner] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, form.userId))
      .limit(1);

    return owner?.email ? [owner.email] : [];
  },

  async getMonthlyResponseCount(userId: string, quotaKey: string): Promise<number> {
    const cached = await safeRedis('quota:responses:get', () => redis.get(quotaKey));
    if (cached !== null) {
      const parsed = Number(cached);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(responses)
      .innerJoin(forms, eq(responses.formId, forms.id))
      .where(and(eq(forms.userId, userId), eq(responses.isSpam, false), gte(responses.createdAt, monthStart)));

    const count = row?.count ?? 0;
    await safeRedisWrite('quota:responses:set', () =>
      redis.set(quotaKey, String(count), 'EX', 35 * 24 * 60 * 60),
    );
    return count;
  },

  async validateAnswers(
    fields: FormField[],
    answers: Record<string, unknown>,
  ): Promise<Array<{ fieldId: string; fieldType: FieldType; value: unknown }>> {
    const out: Array<{ fieldId: string; fieldType: FieldType; value: unknown }> = [];
    const effectiveAnswers = fields.reduce<Record<string, unknown>>((acc, field) => {
      if (field.options && Object.prototype.hasOwnProperty.call(field.options, 'defaultValue')) {
        const value = field.options.defaultValue;
        if (value !== undefined && value !== null && value !== '') acc[field.id] = value;
      }
      return acc;
    }, { ...answers });

    for (const field of fields) {
      if (field.type === 'HEADING' || field.type === 'DIVIDER') continue;
      if (!this.isFieldVisible(field, effectiveAnswers)) continue;

      const raw = effectiveAnswers[field.id];
      const validator = buildFieldValidator(field);
      const parsed = validator.safeParse(raw);

      if (!parsed.success) {
        throw new ValidationError(
          field.validation?.customError ?? `Invalid value for "${field.label}"`,
          { fieldId: field.id, issues: parsed.error.issues },
        );
      }

      let normalizedValue: unknown = parsed.data;
      if (typeof normalizedValue === 'string') {
        normalizedValue = sanitizePlainText(normalizedValue, field.validation?.maxLength ?? 5000);
      }

      const valueIsEmpty =
        normalizedValue === undefined ||
        normalizedValue === null ||
        (typeof normalizedValue === 'string' && normalizedValue.trim() === '') ||
        (Array.isArray(normalizedValue) && normalizedValue.length === 0);

      if (!valueIsEmpty) {
        out.push({ fieldId: field.id, fieldType: field.type, value: normalizedValue });
      } else if (field.required) {
        throw new ValidationError(`"${field.label}" is required`, { fieldId: field.id });
      }
    }
    return out;
  },

  isFieldVisible(field: FormField, answers: Record<string, unknown>): boolean {
    const visibility = field.options?.visibility;
    const rules = visibility?.rules?.filter((rule) => rule.fieldId && rule.operator) ?? [];
    if (rules.length === 0) return true;

    const results = rules.map((rule) => {
      const value = answers[rule.fieldId];
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);

      switch (rule.operator) {
        case 'equals':
          return Array.isArray(value) ? value.includes(String(rule.value)) : String(value) === String(rule.value);
        case 'notEquals':
          return Array.isArray(value) ? !value.includes(String(rule.value)) : String(value) !== String(rule.value);
        case 'contains':
          return Array.isArray(value)
            ? value.includes(String(rule.value))
            : typeof value === 'string' && typeof rule.value === 'string' && value.includes(rule.value);
        case 'notEmpty':
          return !isEmpty;
        case 'empty':
          return isEmpty;
        default:
          return true;
      }
    });

    return visibility?.mode === 'any' ? results.some(Boolean) : results.every(Boolean);
  },

  buildResponsePayload(
    responseId: string,
    form: Form,
    validated: Array<{ fieldId: string; fieldType: FieldType; value: unknown }>,
  ): Record<string, unknown> {
    return {
      id: responseId,
      event: 'response.created',
      createdAt: new Date().toISOString(),
      data: {
        formId: form.id,
        formTitle: form.title,
        answers: validated.map((v) => ({
          fieldId: v.fieldId,
          fieldType: v.fieldType,
          value: v.value,
        })),
      },
    };
  },

  async createUploadUrl(
    formId: string,
    params: { filename: string; mimeType: string; sizeBytes: number },
  ): Promise<ReturnType<typeof generateUploadParams> & { id: string; expiresInSec: number }> {
    const form = (await formsService.getPublicBySlug(formId)) ?? (await this.loadFormById(formId));
    if (!form) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');

    const plan = await this.getOwnerPlan(form.userId);
    const planLimit = Math.min(PLAN_LIMITS[plan].maxFileSizeBytes, CLOUDINARY_MAX_FILE_BYTES);

    if (params.sizeBytes > planLimit) {
      throw new ValidationError(`File exceeds maximum allowed size of ${Math.round(planLimit / (1024 * 1024))} MB`, {
        maxBytes: planLimit,
      });
    }

    const fileId = createId();
    const folder = `formnest/uploads/${form.userId}/${form.id}`;
    const uploadParams = generateUploadParams(folder, params.filename, fileId, planLimit);

    await db.insert(fileUploads).values({
      id: fileId,
      userId: form.userId,
      formId: form.id,
      publicId: uploadParams.publicId,
      originalName: params.filename,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
    });

    return {
      ...uploadParams,
      id: fileId,
      expiresInSec: 300,
    };
  },

  async uploadDirect(
    formId: string,
    file: Express.Multer.File,
  ): Promise<{ id: string; url: string; publicId: string; filename: string; mimeType: string; sizeBytes: number }> {
    const form = (await formsService.getPublicBySlug(formId)) ?? (await this.loadFormById(formId));
    if (!form) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');

    const plan = await this.getOwnerPlan(form.userId);
    const planLimit = Math.min(PLAN_LIMITS[plan].maxFileSizeBytes, CLOUDINARY_MAX_FILE_BYTES);

    if (file.size > planLimit) {
      throw new ValidationError(`File exceeds maximum allowed size of ${Math.round(planLimit / (1024 * 1024))} MB`, {
        maxBytes: planLimit,
      });
    }

    const fileId = createId();
    const folder = `formnest/uploads/${form.userId}/${form.id}`;
    const uploaded = await uploadBufferToCloudinary(file.buffer, folder, file.originalname, fileId);

    await db.insert(fileUploads).values({
      id: fileId,
      userId: form.userId,
      formId: form.id,
      publicId: uploaded.publicId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    return {
      id: fileId,
      url: uploaded.url,
      publicId: uploaded.publicId,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  },
};

// Suppress unused
void gte;
