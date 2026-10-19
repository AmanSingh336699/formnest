import multer from 'multer';
import { ValidationError } from '../lib/AppError';
import { CLOUDINARY_MAX_FILE_BYTES } from '../config/storage';

import { ALLOWED_MIME_TYPES } from '../lib/constants';

const storage = multer.memoryStorage();

export const uploadSingleFile = multer({
  storage,
  limits: {
    fileSize: CLOUDINARY_MAX_FILE_BYTES, // 10 MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new ValidationError('Unsupported file type. Only images and standard documents are allowed.'));
      return;
    }
    cb(null, true);
  },
}).single('file');
