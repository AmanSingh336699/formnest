import type { Request, Response, NextFunction } from 'express';
import { publicService } from './public.service';
import { success } from '../../lib/responseFormatter';
import { ValidationError } from '../../lib/AppError';
import { SUBMIT_GUARDS } from '../../lib/constants';

function pickPublicFormShape(form: Awaited<ReturnType<typeof publicService.getPublicForm>>): unknown {
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    slug: form.slug,
    customSlug: form.customSlug,
    status: form.status,
    theme: form.theme,
    settings: {
      // Only expose user-facing settings; hide owner notification config
      allowMultipleSubmissions: form.settings?.allowMultipleSubmissions ?? false,
      showProgressBar: form.settings?.showProgressBar ?? false,
      redirectUrl: form.settings?.redirectUrl ?? null,
      successMessage: form.settings?.successMessage ?? null,
      closedMessage: form.settings?.closedMessage ?? null,
      limitReachedMessage: form.settings?.limitReachedMessage ?? null,
      maxResponses: form.settings?.maxResponses ?? null,
      showBranding: form.settings?.showBranding ?? true,
    },
    fields: form.fields.map((f) => ({
      id: f.id,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder,
      helpText: f.helpText,
      required: f.required,
      position: f.position,
      validation: f.validation,
      options: f.options,
    })),
  };
}

export const publicController = {
  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = req.params.slug;
      if (!slug) throw new ValidationError('Slug required');
      const form = await publicService.getPublicForm(slug);
      // Track view (fire-and-forget; do not block)
      void publicService.trackView(form.id, req.ip ?? null);
      success(res, pickPublicFormShape(form));
    } catch (err) {
      next(err);
    }
  },

  async trackStart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const formId = req.params.formId;
      if (!formId) throw new ValidationError('formId required');
      await publicService.trackStart(formId, req.ip ?? null);
      success(res, { tracked: true });
    } catch (err) {
      next(err);
    }
  },

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const formIdOrSlug = req.params.formId ?? req.params.slug;
      const bySlug = req.params.slug !== undefined;
      if (!formIdOrSlug) throw new ValidationError('Form identifier required');

      const body = req.body as {
        answers?: Record<string, unknown>;
        loadedAt?: number;
        submittedAt?: number;
        referrer?: string;
        [key: string]: unknown;
      };

      const honeypotValue = body[SUBMIT_GUARDS.honeypotFieldName];
      const result = await publicService.submit({
        formIdOrSlug,
        bySlug,
        answers: body.answers ?? {},
        loadedAt: body.loadedAt,
        submittedAt: body.submittedAt,
        honeypotValue: typeof honeypotValue === 'string' ? honeypotValue : undefined,
        idempotencyKey: (req.headers['idempotency-key'] as string | undefined) ?? undefined,
        ctx: {
          ip: req.ip ?? null,
          userAgent: req.headers['user-agent'] ?? null,
          referrer: body.referrer ?? (req.headers.referer as string | undefined) ?? null,
        },
      });

      success(res, result, undefined, 201);
    } catch (err) {
      next(err);
    }
  },

  async createUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const formId = req.params.formId;
      if (!formId) throw new ValidationError('formId required');
      const body = req.body as { filename?: string; mimeType?: string; sizeBytes?: number };
      if (!body.filename || !body.mimeType || typeof body.sizeBytes !== 'number') {
        throw new ValidationError('filename, mimeType, and sizeBytes are required');
      }
      const result = await publicService.createUploadUrl(formId, {
        filename: body.filename,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
      });
      success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async uploadDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const formId = req.params.formId;
      if (!formId) throw new ValidationError('formId required');
      const file = req.file;
      if (!file) throw new ValidationError('No file provided');

      const result = await publicService.uploadDirect(formId, file);
      success(res, result, undefined, 201);
    } catch (err) {
      next(err);
    }
  },
};
