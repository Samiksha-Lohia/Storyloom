import { Router } from 'express';
import { authenticate, authenticateOptional } from '../middleware/auth.middleware.js';
import { authorize, requireActive } from '../middleware/rbac.middleware.js';
import { USER_ROLES } from '../constants/user-roles.js';
import * as writerController from '../controllers/writer.controller.js';

export const PUBLIC_ROUTES = ['GET /profile/:id', 'GET /:username'];

const router = Router();

/**
 * GET /api/writer/profile/:id
 * Public writer profile. Records profile_view.
 */
router.get('/profile/:id', authenticateOptional, writerController.getProfile);

/**
 * GET /api/writer/analytics
 * Writer dashboard metrics, series, drop-off, and book comparison.
 */
router.get(
  '/analytics',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  writerController.getAnalytics
);

/**
 * GET /api/writer/analytics/explain
 * Explain execution plan for the drop-off aggregation.
 */
router.get(
  '/analytics/explain',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  writerController.getDropOffExplain
);

/**
 * GET /api/writer/reviews
 * Filtered reviews across writer's books for /w/reviews.
 */
router.get(
  '/reviews',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  writerController.getReviews
);

/**
 * PUT /api/writers/:username/follow
 * Follow a writer
 */
router.put(
  '/:username/follow',
  authenticate,
  requireActive,
  writerController.followWriter
);

/**
 * DELETE /api/writers/:username/follow
 * Unfollow a writer
 */
router.delete(
  '/:username/follow',
  authenticate,
  requireActive,
  writerController.unfollowWriter
);

/**
 * GET /api/writers/:username
 * Public writer profile by username. Records profile_view.
 */
router.get(
  '/:username',
  authenticateOptional,
  writerController.getProfile
);

export default router;
