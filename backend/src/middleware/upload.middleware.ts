import multer from 'multer';
import { ValidationError } from '../lib/AppError';
import { CLOUDINARY_MAX_FILE_BYTES } from '../config/storage';

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

const storage = multer.memoryStorage();

export const uploadSingleFile = multer({
  storage,
  limits: {
    fileSize: CLOUDINARY_MAX_FILE_BYTES, // 10 MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new ValidationError('Unsupported file type. Only images and standard documents are allowed.'));
      return;
    }
    cb(null, true);
  },
}).single('file');
