import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export interface CloudinaryUploadParams {
  uploadUrl: string;
  publicId: string;
  folder: string;
  timestamp: number;
  maxFileSize: number;
  signature: string;
  apiKey: string;
  cloudName: string;
}

export const CLOUDINARY_MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB free tier limit

export function generateUploadParams(
  folder: string,
  filename: string,
  fileId: string,
  maxFileSizeBytes = CLOUDINARY_MAX_FILE_BYTES,
): CloudinaryUploadParams {
  const timestamp = Math.round(Date.now() / 1000);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const publicId = `${fileId}-${safeName}`;
  const effectiveMaxFileSize = Math.min(maxFileSizeBytes, CLOUDINARY_MAX_FILE_BYTES);

  const paramsToSign = {
    folder,
    max_file_size: effectiveMaxFileSize,
    public_id: publicId,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    env.CLOUDINARY_API_SECRET,
  );

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    publicId: `${folder}/${publicId}`,
    folder,
    timestamp,
    maxFileSize: effectiveMaxFileSize,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  };
}

export function getDownloadUrl(publicId: string, originalName?: string, mimeType?: string): string {
  const isImage = mimeType?.startsWith('image/');

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: 'auto',
    ...(isImage
      ? { quality: 'auto', fetch_format: 'auto' }
      : {}),
    flags: originalName ? `attachment:${originalName}` : undefined,
  });
}

export async function deleteObject(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'auto' });
}

export function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  filename: string,
  fileId: string,
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const publicId = `${fileId}-${safeName}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'auto',
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload to Cloudinary failed'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    stream.end(buffer);
  });
}
