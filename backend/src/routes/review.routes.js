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

router.get(
  '/',
  authenticateOptional,
  validate(queryReviewSchema),
  reviewController.getBookReviews
);

router.post(
  '/',
  authenticate,
  requireActive,
  reviewPostLimiter,
  validate(createReviewSchema),
  reviewController.createReview
);

router.patch(
  '/:reviewId',
  authenticate,
  requireActive,
  validate(updateReviewSchema),
  reviewController.updateReview
);

router.delete(
  '/:reviewId',
  authenticate,
  requireActive,
  validate(reviewIdParamSchema),
  reviewController.deleteReview
);

router.patch(
  '/:reviewId/read',
  authenticate,
  requireActive,
  reviewController.markReviewRead
);

export default router;
