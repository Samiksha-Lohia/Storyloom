import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireActive } from '../middleware/rbac.middleware.js';
import * as notificationController from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticate, requireActive);

router.get('/', notificationController.getNotifications);

router.get('/unread-count', notificationController.getUnreadCount);

router.patch('/read-all', notificationController.markAllRead);

router.patch('/:id/read', notificationController.markRead);

export default router;
