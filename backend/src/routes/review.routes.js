import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { authenticate, authenticateOptional } from '../middleware/auth.middleware.js';
import { requireActive } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamSchema,
  queryReviewSchema,
} from '../validators/review.validator.js';
import * as reviewController from '../controllers/review.controller.js';
import { ApiError } from '../utilities/custom-errors.js';

const router = Router({ mergeParams: true });

// Rate limiter for review posting: 30 reviews per hour per user/IP
const reviewPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:review:',
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id || 'anon'}`,
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many review submissions. Please try again later.'));
  },
});

/**
 * GET /api/books/:bookId/reviews
 * Public endpoint to fetch reviews, histogram, and optional current user review
 */
router.get(
  '/',
  authenticateOptional,
  validate(queryReviewSchema),
  reviewController.getBookReviews
);

/**
 * POST /api/books/:bookId/reviews
 * Readers only, rate limited, duplicate guarded
 */
router.post(
  '/',
  authenticate,
  requireActive,
  reviewPostLimiter,
  validate(createReviewSchema),
  reviewController.createReview
);

/**
 * PATCH /api/books/:bookId/reviews/:reviewId
 * Review owner or admin
 */
router.patch(
  '/:reviewId',
  authenticate,
  requireActive,
  validate(updateReviewSchema),
  reviewController.updateReview
);

/**
 * DELETE /api/books/:bookId/reviews/:reviewId
 * Review owner or admin
 */
router.delete(
  '/:reviewId',
  authenticate,
  requireActive,
  validate(reviewIdParamSchema),
  reviewController.deleteReview
);

/**
 * PATCH /api/books/:bookId/reviews/:reviewId/read
 * Writer marks a review as read (clears new-review badge)
 */
router.patch(
  '/:reviewId/read',
  authenticate,
  requireActive,
  reviewController.markReviewRead
);

export default router;
