import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize, requireActive } from '../middleware/rbac.middleware.js';
import { uploadAvatar } from '../middleware/upload.middleware.js';
import * as imageService from '../services/image.service.js';
import userRepository from '../repositories/user.repository.js';
import { sendSuccess } from '../utilities/response.js';
import { ApiError, BadRequestError, NotFoundError } from '../utilities/custom-errors.js';
import { USER_ROLES_LIST } from '../constants/user-roles.js';

export const PUBLIC_ROUTES = [];

const router = Router();

const avatarUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:upload:',
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id || 'anon'}`,
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many avatar upload attempts. Please try again later.'));
  },
});

router.post(
  '/avatar',
  authenticate,
  requireActive,
  authorize(...USER_ROLES_LIST),
  avatarUploadLimiter,
  uploadAvatar,
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new BadRequestError('Avatar image file is required.');
      }

      const user = await userRepository.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found.');
      }

      const oldPublicId = user.avatarPublicId;

      const result = await imageService.saveImage(req.file.buffer, {
        folder: 'platform/avatars',
        mimetype: req.file.mimetype,
      });

      if (oldPublicId) {
        await imageService.deleteImage(oldPublicId);
      }

      user.avatarPublicId = result.publicId;
      user.avatarUrl = result.url;
      await user.save();

      sendSuccess(res, { publicId: result.publicId, url: result.url }, 200, 'Avatar uploaded successfully.');
    } catch (err) {
      next(err);
    }
  }
);

export default router;
