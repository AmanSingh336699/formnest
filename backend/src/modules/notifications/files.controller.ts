import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { generateUploadParams, getDownloadUrl, uploadBufferToCloudinary, CLOUDINARY_MAX_FILE_BYTES } from '../../config/storage';
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
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
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

      const planLimit = Math.min(PLAN_LIMITS[req.user.plan].maxFileSizeBytes, CLOUDINARY_MAX_FILE_BYTES);
      if (body.sizeBytes > planLimit) {
        throw new ValidationError(`File exceeds maximum allowed size of ${Math.round(planLimit / (1024 * 1024))} MB`, {
          maxBytes: planLimit,
        });
      }
      if (!ALLOWED_MIME.has(body.mimeType)) {
        throw new ValidationError('Unsupported file type. Only images and standard documents are allowed.', { mimeType: body.mimeType });
      }

      const fileId = createId();
      const folder = `formnest/uploads/${req.user.id}/${body.formId}`;

      const uploadParams = generateUploadParams(folder, body.filename, fileId, planLimit);

      await db.insert(fileUploads).values({
        id: fileId,
        userId: req.user.id,
        formId: body.formId,
        publicId: uploadParams.publicId,
        originalName: body.filename,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
      });

      success(res, {
        id: fileId,
        uploadUrl: uploadParams.uploadUrl,
        publicId: uploadParams.publicId,
        folder: uploadParams.folder,
        timestamp: uploadParams.timestamp,
        maxFileSize: uploadParams.maxFileSize,
        signature: uploadParams.signature,
        apiKey: uploadParams.apiKey,
        cloudName: uploadParams.cloudName,
        expiresInSec: 300,
      });
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

      const url = getDownloadUrl(file.publicId, file.originalName, file.mimeType);
      success(res, { url, expiresInSec: 300, filename: file.originalName });
    } catch (err) {
      next(err);
    }
  },

  async uploadDirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const file = req.file;
      if (!file) throw new ValidationError('No file provided');

      const formId = (req.body.formId as string) || 'preview';
      const fileId = createId();
      const folder = `formnest/uploads/${req.user.id}/${formId}`;

      const uploaded = await uploadBufferToCloudinary(file.buffer, folder, file.originalname, fileId);

      await db.insert(fileUploads).values({
        id: fileId,
        userId: req.user.id,
        formId,
        publicId: uploaded.publicId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });

      success(
        res,
        {
          id: fileId,
          url: uploaded.url,
          publicId: uploaded.publicId,
          filename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
        undefined,
        201,
      );
    } catch (err) {
      next(err);
    }
  },
};
