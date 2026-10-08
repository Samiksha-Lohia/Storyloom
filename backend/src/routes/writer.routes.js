import { Router } from 'express';
import { authenticate, authenticateOptional } from '../middleware/auth.middleware.js';
import { authorize, requireActive } from '../middleware/rbac.middleware.js';
import { USER_ROLES } from '../constants/user-roles.js';
import * as writerController from '../controllers/writer.controller.js';

export const PUBLIC_ROUTES = ['GET /profile/:id', 'GET /:username'];

const router = Router();

router.get('/profile/:id', authenticateOptional, writerController.getProfile);

router.get(
  '/analytics',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  writerController.getAnalytics
);

router.get(
  '/analytics/explain',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  writerController.getDropOffExplain
);

router.get(
  '/reviews',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  writerController.getReviews
);

router.put(
  '/:username/follow',
  authenticate,
  requireActive,
  writerController.followWriter
);

router.delete(
  '/:username/follow',
  authenticate,
  requireActive,
  writerController.unfollowWriter
);

router.get(
  '/:username',
  authenticateOptional,
  writerController.getProfile
);

export default router;
