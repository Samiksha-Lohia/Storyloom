import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireActive } from '../middleware/rbac.middleware.js';
import * as reviewController from '../controllers/review.controller.js';

export const PUBLIC_ROUTES = [];

const router = Router();

/**
 * PATCH /api/reviews/:id/read
 * Allows book author or admin to mark a review as read by review ID.
 */
router.patch('/:id/read', authenticate, requireActive, reviewController.markReviewRead);

export default router;
