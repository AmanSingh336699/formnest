/**
 * S3-compatible storage client (works with MinIO local, R2/S3 prod).
 * Used for file uploads, theme logos, and exports.
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // required for MinIO; harmless for R2
});

/** Generate a pre-signed PUT URL the client uses to upload directly to S3. */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
}

/** Generate a pre-signed GET URL for downloads. */
export async function getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export function buildPublicUrl(key: string): string {
  return `${env.S3_PUBLIC_URL}/${key}`;
}
