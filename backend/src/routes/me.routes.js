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

// Per-user rate limiter for reading progress updates (120 updates per minute)
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

// All /me routes require authentication and active status
router.use(authenticate, requireActive);

// Allowed roles for library and reader settings: reader, publisher, writer, admin
const ALLOWED_ROLES = [
  USER_ROLES.READER,
  USER_ROLES.PUBLISHER,
  USER_ROLES.WRITER,
  USER_ROLES.ADMIN,
];

/**
 * PUT /api/me/mature-ack
 * Acknowledges 18+ mature content warning
 */
router.put('/mature-ack', authorize(...ALLOWED_ROLES), MeController.matureAck);

/**
 * PATCH /api/me/profile
 * Updates user profile (name, bio, defaultTemplate)
 */
router.patch(
  '/profile',
  authorize(...ALLOWED_ROLES),
  validate(updateProfileSchema),
  MeController.updateProfile
);

/**
 * PATCH /api/me/settings
 * Updates reader typography and theme settings
 */
router.patch(
  '/settings',
  authorize(...ALLOWED_ROLES),
  validate(readerSettingsSchema),
  MeController.updateSettings
);

/**
 * GET /api/me/library
 * Retrieves reader's reading list
 */
router.get(
  '/library',
  authorize(...ALLOWED_ROLES),
  validate(libraryQuerySchema),
  MeController.getLibrary
);

/**
 * GET /api/me/library/:bookId
 * Retrieves specific book progress and bookmarks
 */
router.get(
  '/library/:bookId',
  authorize(...ALLOWED_ROLES),
  MeController.getLibraryBook
);

/**
 * PUT /api/me/library/:bookId
 * Updates reading progress and bookmarks (rate-limited)
 */
router.put(
  '/library/:bookId',
  authorize(...ALLOWED_ROLES),
  progressLimiter,
  validate(updateLibrarySchema),
  MeController.updateLibraryBook
);

/**
 * DELETE /api/me/library/:bookId
 * Removes book from reader's reading list
 */
router.delete(
  '/library/:bookId',
  authorize(...ALLOWED_ROLES),
  MeController.deleteLibraryBook
);

// ─── Publisher Wishlist Routes ───────────────────────────────────────────────

/**
 * GET /api/me/wishlist
 * Roles: approved publisher
 * Lists wishlisted books for the publisher
 */
router.get('/wishlist', requireApprovedPublisher, wishlistController.getWishlist);

/**
 * GET /api/me/wishlist/:bookId
 * Roles: approved publisher
 * Checks whether a specific book is wishlisted
 */
router.get(
  '/wishlist/:bookId',
  requireApprovedPublisher,
  validate(bookIdParamSchema),
  wishlistController.getWishlistBook
);

/**
 * PUT /api/me/wishlist/:bookId
 * Roles: approved publisher
 * Stars/adds a book to the publisher's private wishlist
 */
router.put(
  '/wishlist/:bookId',
  requireApprovedPublisher,
  validate(bookIdParamSchema),
  wishlistController.addToWishlist
);

/**
 * DELETE /api/me/wishlist/:bookId
 * Roles: approved publisher
 * Removes a book from the publisher's private wishlist
 */
router.delete(
  '/wishlist/:bookId',
  requireApprovedPublisher,
  validate(bookIdParamSchema),
  wishlistController.removeFromWishlist
);

export default router;

