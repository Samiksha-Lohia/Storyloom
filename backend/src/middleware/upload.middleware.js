import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config/env.js';
import { BadRequestError } from '../utilities/custom-errors.js';

/**
 * Multer storage strategy for legacy single uploads:
 *  - local: writes to UPLOAD_DIR on disk
 *  - s3:    uses memoryStorage so the buffer can be streamed to S3
 */
const buildStorage = () => {
  if (config.storage.provider === 's3') {
    return multer.memoryStorage();
  }

  // Ensure local upload directory exists
  if (!fs.existsSync(config.file.uploadDir)) {
    fs.mkdirSync(config.file.uploadDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, config.file.uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });
};

/**
 * Multer file filter — only accepts configured MIME types.
 */
const fileFilter = (_req, file, cb) => {
  if (config.file.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `Unsupported file type: ${file.mimetype}. Allowed types: ${config.file.allowedTypes.join(', ')}`
      ),
      false
    );
  }
};

const upload = multer({
  storage: buildStorage(),
  limits: { fileSize: config.file.maxSizeBytes },
  fileFilter,
});

/**
 * Single-file upload middleware for field name "file".
 * Usage: router.post('/documents', uploadSingle, handler)
 */
const uploadSingle = upload.single('file');

/**
 * Book upload middleware with fields:
 * - manuscript: PDF, DOCX, TXT (up to MAX_FILE_SIZE_MB, default 15MB)
 * - cover: JPEG, PNG, WebP (up to 5MB)
 * Uses memoryStorage so buffers can be streamed to storage/Cloudinary.
 */
const ALLOWED_MANUSCRIPT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const bookMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(config.file.maxSizeBytes, 15 * 1024 * 1024),
  },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'manuscript') {
      if (ALLOWED_MANUSCRIPT_TYPES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(
        new BadRequestError(
          `Unsupported manuscript file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT`
        ),
        false
      );
    }
    if (file.fieldname === 'cover') {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(
        new BadRequestError(
          `Unsupported cover image type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`
        ),
        false
      );
    }
    cb(new BadRequestError(`Unexpected upload field: ${file.fieldname}`), false);
  },
});

const uploadBookFields = bookMulter.fields([
  { name: 'manuscript', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

export const uploadBook = (req, res, next) => {
  uploadBookFields(req, res, (err) => {
    if (err) return next(err);

    // Validate cover file size separately (5MB limit)
    const coverFile = req.files?.cover?.[0];
    if (coverFile && coverFile.size > 5 * 1024 * 1024) {
      return next(new BadRequestError('Cover image exceeds the maximum allowed size of 5MB.'));
    }

    // Validate manuscript file size against config
    const manuscriptFile = req.files?.manuscript?.[0];
    if (manuscriptFile && manuscriptFile.size > config.file.maxSizeBytes) {
      const maxMb = config.file.maxSizeBytes / (1024 * 1024);
      return next(new BadRequestError(`Manuscript file exceeds the maximum allowed size of ${maxMb}MB.`));
    }

    next();
  });
};

/**
 * Image upload middleware for single image (cover or avatar, max 5MB)
 */
const singleImageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Unsupported image type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`
        ),
        false
      );
    }
  },
});

export const uploadCover = singleImageMulter.single('cover');
export const uploadAvatar = singleImageMulter.single('avatar');

export { upload, uploadSingle };
