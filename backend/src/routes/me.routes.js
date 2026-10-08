import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize, requireActive, requireApprovedPublisher } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { MeController } from '../controllers/me.controller.js';
import * as wishlistController from '../controllers/wishlist.controller.js';
import {
  readerSettingsSchema,
  updateLibrarySchema,
  libraryQuerySchema,
  updateProfileSchema,
} from '../validators/me.validator.js';
import { bookIdParamSchema } from '../validators/book.validator.js';
import { ApiError } from '../utilities/custom-errors.js';
import { USER_ROLES } from '../constants/user-roles.js';

export const PUBLIC_ROUTES = [];

const router = Router();

const progressLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:progress:',
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id || 'anon'}`,
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many progress update requests. Please debounce client updates.'));
  },
});

router.use(authenticate, requireActive);

const ALLOWED_ROLES = [
  USER_ROLES.READER,
  USER_ROLES.PUBLISHER,
  USER_ROLES.WRITER,
  USER_ROLES.ADMIN,
];

router.put('/mature-ack', authorize(...ALLOWED_ROLES), MeController.matureAck);

router.patch(
  '/profile',
  authorize(...ALLOWED_ROLES),
  validate(updateProfileSchema),
  MeController.updateProfile
);

router.patch(
  '/settings',
  authorize(...ALLOWED_ROLES),
  validate(readerSettingsSchema),
  MeController.updateSettings
);

router.get(
  '/library',
  authorize(...ALLOWED_ROLES),
  validate(libraryQuerySchema),
  MeController.getLibrary
);

router.get(
  '/reading-list',
  authorize(...ALLOWED_ROLES),
  validate(libraryQuerySchema),
  MeController.getLibrary
);

router.get(
  '/library/:bookId',
  authorize(...ALLOWED_ROLES),
  MeController.getLibraryBook
);

router.put(
  '/library/:bookId',
  authorize(...ALLOWED_ROLES),
  progressLimiter,
  validate(updateLibrarySchema),
  MeController.updateLibraryBook
);

router.delete(
  '/library/:bookId',
  authorize(...ALLOWED_ROLES),
  MeController.deleteLibraryBook
);

router.get('/wishlist', requireApprovedPublisher, wishlistController.getWishlist);

router.get(
  '/wishlist/:bookId',
  requireApprovedPublisher,
  validate(bookIdParamSchema),
  wishlistController.getWishlistBook
);

router.put(
  '/wishlist/:bookId',
  requireApprovedPublisher,
  validate(bookIdParamSchema),
  wishlistController.addToWishlist
);

router.delete(
  '/wishlist/:bookId',
  requireApprovedPublisher,
  validate(bookIdParamSchema),
  wishlistController.removeFromWishlist
);

export default router;

