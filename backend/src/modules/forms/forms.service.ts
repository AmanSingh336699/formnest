/**
 * Forms service. All form CRUD, publish, duplicate operations.
 * Enforces plan limits via planLimits service.
 */
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { forms, formFields, type Form, type FormField } from '../../../drizzle/schema/forms';
import { recordAudit } from '../../lib/auditLog';
import { NotFoundError, ForbiddenError, ConflictError, PaymentRequiredError } from '../../lib/AppError';
import { PLAN_LIMITS, TOKEN_TTL } from '../../lib/constants';
import type { CreateFormBody, UpdateFormBody } from './forms.validators';
import type { AuthenticatedUser } from '../../middleware/auth.middleware';
import { logger } from '../../config/logger';
import { safeRedis, safeRedisWrite } from '../../lib/redisSafe';

function generateSlug(): string {
  // 8-char URL-safe slug; collision-resistant per cuid2
  return createId().slice(0, 8);
}

function cacheKeyForSlug(slug: string): string {
  return `form:slug:${slug}`;
}

async function invalidateFormCache(slug: string, customSlug?: string | null): Promise<void> {
  const keys = [cacheKeyForSlug(slug)];
  if (customSlug) keys.push(cacheKeyForSlug(customSlug));
  await safeRedisWrite('form-cache:del', () => redis.del(...keys));
}

export const formsService = {
  async listForUser(
    userId: string,
    params: { page: number; limit: number; status?: string; search?: string },
  ): Promise<{ items: Form[]; total: number }> {
    const conditions = [eq(forms.userId, userId)];
    if (params.status) {
      conditions.push(eq(forms.status, params.status as Form['status']));
    }
    if (params.search) {
      const term = `%${params.search}%`;
      const searchCond = or(ilike(forms.title, term), ilike(forms.description, term));
      if (searchCond) conditions.push(searchCond);
    }

    const where = and(...conditions);

    const offset = (params.page - 1) * params.limit;

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(forms)
        .where(where)
        .orderBy(desc(forms.createdAt))
        .limit(params.limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(forms).where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;
    return { items, total };
  },

  async getByIdForUser(formId: string, userId: string, includeFields = true): Promise<Form & { fields?: FormField[] }> {
    const [form] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.userId, userId)))
      .limit(1);
    if (!form) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');

    if (!includeFields) return form;

    const fields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, formId))
      .orderBy(formFields.position);

    return { ...form, fields };
  },

  async create(user: AuthenticatedUser, body: CreateFormBody, ctx: { ip: string | null; ua: string | null }): Promise<Form & { fields: FormField[] }> {
    // Plan limit: max forms (FREE only)
    if (user.plan === 'FREE') {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(forms)
        .where(eq(forms.userId, user.id));
      const count = result[0]?.count ?? 0;
      if (count >= PLAN_LIMITS.FREE.maxForms) {
        throw new PaymentRequiredError(
          `You've reached the free plan limit of ${PLAN_LIMITS.FREE.maxForms} forms. Upgrade to Pro for unlimited.`,
          'FORM_LIMIT_REACHED',
        );
      }
    }

    const slug = generateSlug();

    const created = await db.transaction(async (tx) => {
      const [form] = await tx
        .insert(forms)
        .values({
          userId: user.id,
          title: body.title,
          description: body.description ?? null,
          slug,
          status: 'DRAFT',
          theme: body.theme ?? null,
          settings: body.settings ?? null,
        })
        .returning();

      if (!form) throw new Error('Failed to create form');

      let insertedFields: FormField[] = [];
      if (body.fields && body.fields.length > 0) {
        insertedFields = await tx
          .insert(formFields)
          .values(
            body.fields.map((f, i) => ({
              id: f.id,
              formId: form.id,
              type: f.type,
              label: f.label,
              placeholder: f.placeholder ?? null,
              helpText: f.helpText ?? null,
              required: f.required,
              position: f.position ?? i,
              validation: f.validation ?? null,
              options: f.options ?? null,
            })),
          )
          .returning();
      }
      return { form, insertedFields };
    });

    await recordAudit({
      userId: user.id,
      entityType: 'form',
      entityId: created.form.id,
      action: 'CREATE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return { ...created.form, fields: created.insertedFields };
  },

  async update(
    user: AuthenticatedUser,
    formId: string,
    body: UpdateFormBody,
    ctx: { ip: string | null; ua: string | null },
  ): Promise<Form & { fields: FormField[] }> {
    const existing = await this.getByIdForUser(formId, user.id, false);

    // customSlug: require PRO+
    if (body.customSlug !== undefined && body.customSlug !== null) {
      if (!PLAN_LIMITS[user.plan].customSlug) {
        throw new PaymentRequiredError('Custom slugs require the Pro plan', 'PLAN_REQUIRED');
      }
      const [conflict] = await db
        .select({ id: forms.id })
        .from(forms)
        .where(and(eq(forms.customSlug, body.customSlug)))
        .limit(1);
      if (conflict && conflict.id !== formId) {
        throw new ConflictError('That custom slug is already taken');
      }
    }

    const updatePayload: Partial<Form> = { updatedAt: new Date() };
    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.description !== undefined) updatePayload.description = body.description;
    if (body.theme !== undefined) updatePayload.theme = body.theme;
    if (body.settings !== undefined) updatePayload.settings = body.settings;
    if (body.customSlug !== undefined) updatePayload.customSlug = body.customSlug;

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx.update(forms).set(updatePayload).where(eq(forms.id, formId)).returning();
      if (!updated) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');

      let allFields: FormField[];
      if (body.fields !== undefined) {
        // Full replace strategy: delete existing, insert new
        await tx.delete(formFields).where(eq(formFields.formId, formId));
        if (body.fields.length > 0) {
          allFields = await tx
            .insert(formFields)
            .values(
              body.fields.map((f, i) => ({
                id: f.id,
                formId,
                type: f.type,
                label: f.label,
                placeholder: f.placeholder ?? null,
                helpText: f.helpText ?? null,
                required: f.required,
                position: f.position ?? i,
                validation: f.validation ?? null,
                options: f.options ?? null,
              })),
            )
            .returning();
        } else {
          allFields = [];
        }
      } else {
        allFields = await tx
          .select()
          .from(formFields)
          .where(eq(formFields.formId, formId))
          .orderBy(formFields.position);
      }

      return { updated, allFields };
    });

    await invalidateFormCache(result.updated.slug, result.updated.customSlug);

    await recordAudit({
      userId: user.id,
      entityType: 'form',
      entityId: formId,
      action: 'UPDATE',
      diff: { before: { title: existing.title }, after: { title: result.updated.title } },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return { ...result.updated, fields: result.allFields };
  },

  async publish(user: AuthenticatedUser, formId: string, ctx: { ip: string | null; ua: string | null }): Promise<Form> {
    const form = await this.getByIdForUser(formId, user.id);
    if (!form.fields || form.fields.length === 0) {
      throw new ForbiddenError('A form must have at least one field before publishing');
    }
    const inputFields = form.fields.filter((f) => f.type !== 'HEADING' && f.type !== 'DIVIDER');
    if (inputFields.length === 0) {
      throw new ForbiddenError('A form must have at least one input field before publishing');
    }

    const [updated] = await db
      .update(forms)
      .set({ status: 'PUBLISHED', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(forms.id, formId))
      .returning();

    if (!updated) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');

    await invalidateFormCache(updated.slug, updated.customSlug);

    await recordAudit({
      userId: user.id,
      entityType: 'form',
      entityId: formId,
      action: 'PUBLISH',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return updated;
  },

  async close(user: AuthenticatedUser, formId: string, ctx: { ip: string | null; ua: string | null }): Promise<Form> {
    await this.getByIdForUser(formId, user.id, false);
    const [updated] = await db
      .update(forms)
      .set({ status: 'CLOSED', closedAt: new Date(), updatedAt: new Date() })
      .where(eq(forms.id, formId))
      .returning();
    if (!updated) throw new NotFoundError('Form not found', 'FORM_NOT_FOUND');

    await invalidateFormCache(updated.slug, updated.customSlug);
    await recordAudit({
      userId: user.id,
      entityType: 'form',
      entityId: formId,
      action: 'CLOSE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
    return updated;
  },

  async delete(user: AuthenticatedUser, formId: string, ctx: { ip: string | null; ua: string | null }): Promise<void> {
    const form = await this.getByIdForUser(formId, user.id, false);
    await db.delete(forms).where(eq(forms.id, formId));
    await invalidateFormCache(form.slug, form.customSlug);

    await recordAudit({
      userId: user.id,
      entityType: 'form',
      entityId: formId,
      action: 'DELETE',
      ip: ctx.ip,
      userAgent: ctx.ua,
    });
  },

  async duplicate(
    user: AuthenticatedUser,
    formId: string,
    ctx: { ip: string | null; ua: string | null },
  ): Promise<Form & { fields: FormField[] }> {
    const source = await this.getByIdForUser(formId, user.id);

    if (user.plan === 'FREE') {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(forms)
        .where(eq(forms.userId, user.id));
      const count = result[0]?.count ?? 0;
      if (count >= PLAN_LIMITS.FREE.maxForms) {
        throw new PaymentRequiredError('Form limit reached', 'FORM_LIMIT_REACHED');
      }
    }

    const result = await db.transaction(async (tx) => {
      const [newForm] = await tx
        .insert(forms)
        .values({
          userId: user.id,
          title: `${source.title} (Copy)`,
          description: source.description,
          slug: generateSlug(),
          status: 'DRAFT',
          theme: source.theme,
          settings: source.settings,
        })
        .returning();

      if (!newForm) throw new Error('Failed to duplicate form');

      let newFields: FormField[] = [];
      if (source.fields && source.fields.length > 0) {
        newFields = await tx
          .insert(formFields)
          .values(
            source.fields.map((f) => ({
              formId: newForm.id,
              type: f.type,
              label: f.label,
              placeholder: f.placeholder,
              helpText: f.helpText,
              required: f.required,
              position: f.position,
              validation: f.validation,
              options: f.options,
            })),
          )
          .returning();
      }
      return { form: newForm, fields: newFields };
    });

    await recordAudit({
      userId: user.id,
      entityType: 'form',
      entityId: result.form.id,
      action: 'DUPLICATE',
      diff: { sourceId: formId },
      ip: ctx.ip,
      userAgent: ctx.ua,
    });

    return { ...result.form, fields: result.fields };
  },

  async getPublicBySlug(slug: string): Promise<(Form & { fields: FormField[] }) | null> {
    const cacheKey = cacheKeyForSlug(slug);
    const cached = await safeRedis('form-cache:get', () => redis.get(cacheKey));
    if (cached) {
      try {
        return JSON.parse(cached) as Form & { fields: FormField[] };
      } catch {
        logger.warn({ slug }, 'Corrupted form cache entry, refetching');
      }
    }

    const [form] = await db
      .select()
      .from(forms)
      .where(or(eq(forms.slug, slug), eq(forms.customSlug, slug)))
      .limit(1);
    if (!form) return null;

    const fields = await db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, form.id))
      .orderBy(formFields.position);

    const result = { ...form, fields };

    // Only cache PUBLISHED forms
    if (form.status === 'PUBLISHED') {
      await safeRedisWrite('form-cache:set', () =>
        redis.set(cacheKey, JSON.stringify(result), 'EX', TOKEN_TTL.EDGE_CACHE_SEC),
      );
    }

    return result;
  },
};
