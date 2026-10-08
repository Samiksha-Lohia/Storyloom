import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config/env.js';
import { BadRequestError } from '../utilities/custom-errors.js';

const buildStorage = () => {
  if (config.storage.provider === 's3') {
    return multer.memoryStorage();
  }

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

const uploadSingle = upload.single('file');

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
    if (file.fieldname === 'manuscript' || file.fieldname === 'file') {
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
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

export const uploadBook = (req, res, next) => {
  uploadBookFields(req, res, (err) => {
    if (err) return next(err);

    const coverFile = req.files?.cover?.[0];
    if (coverFile && coverFile.size > 5 * 1024 * 1024) {
      return next(new BadRequestError('Cover image exceeds the maximum allowed size of 5MB.'));
    }

    const manuscriptFile = req.files?.manuscript?.[0] || req.files?.file?.[0];
    if (manuscriptFile && manuscriptFile.size > config.file.maxSizeBytes) {
      const maxMb = config.file.maxSizeBytes / (1024 * 1024);
      return next(new BadRequestError(`Manuscript file exceeds the maximum allowed size of ${maxMb}MB.`));
    }

    next();
  });
};

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
