import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireActive } from '../middleware/rbac.middleware.js';
import * as notificationController from '../controllers/notification.controller.js';

const router = Router();

// All notification routes require authentication and active status
router.use(authenticate, requireActive);

/**
 * GET /api/notifications
 * Get user's notifications (paginated)
 */
router.get('/', notificationController.getNotifications);

/**
 * GET /api/notifications/unread-count
 * Quick count of unread notifications
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', notificationController.markAllRead);

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', notificationController.markRead);

export default router;
