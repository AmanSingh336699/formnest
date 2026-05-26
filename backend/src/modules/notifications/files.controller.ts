/**
 * File upload signed URL endpoint. Client uploads directly to S3 with the returned URL.
 */
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { getSignedUploadUrl, getSignedDownloadUrl } from '../../config/storage';
import { fileUploads } from '../../../drizzle/schema/responses';
import { success } from '../../lib/responseFormatter';
import { UnauthorizedError, ValidationError, NotFoundError, ForbiddenError } from '../../lib/AppError';
import { PLAN_LIMITS } from '../../lib/constants';

const UploadUrlBodySchema = z
  .object({
    formId: z.string().min(1).max(50),
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(100),
    sizeBytes: z.number().int().positive(),
  })
  .strict();

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const filesController = {
  async createUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const body = UploadUrlBodySchema.parse(req.body);

      const planLimit = PLAN_LIMITS[req.user.plan].maxFileSizeBytes;
      if (body.sizeBytes > planLimit) {
        throw new ValidationError(`File too large for your plan (max ${planLimit} bytes)`, {
          maxBytes: planLimit,
        });
      }
      if (!ALLOWED_MIME.has(body.mimeType)) {
        throw new ValidationError('Unsupported file type', { mimeType: body.mimeType });
      }

      const fileId = createId();
      const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
      const s3Key = `uploads/${req.user.id}/${body.formId}/${fileId}-${safeName}`;

      const uploadUrl = await getSignedUploadUrl(s3Key, body.mimeType, 300);

      await db.insert(fileUploads).values({
        id: fileId,
        userId: req.user.id,
        formId: body.formId,
        s3Key,
        originalName: body.filename,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
      });

      success(res, { id: fileId, uploadUrl, s3Key, expiresInSec: 300 });
    } catch (err) {
      next(err);
    }
  },

  async getDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const id = req.params.id;
      if (!id) throw new ValidationError();
      const [file] = await db.select().from(fileUploads).where(eq(fileUploads.id, id)).limit(1);
      if (!file) throw new NotFoundError('File not found');
      if (file.userId !== req.user.id) throw new ForbiddenError();

      const url = await getSignedDownloadUrl(file.s3Key, 300);
      success(res, { url, expiresInSec: 300, filename: file.originalName });
    } catch (err) {
      next(err);
    }
  },
};
