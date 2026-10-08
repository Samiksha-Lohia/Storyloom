import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize, requireActive } from '../middleware/rbac.middleware.js';
import { USER_ROLES } from '../constants/user-roles.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize(USER_ROLES.PUBLISHER, USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  conversationController.list
);

router.get(
  '/:id',
  authenticate,
  authorize(USER_ROLES.PUBLISHER, USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  conversationController.getById
);

router.get(
  '/:id/messages',
  authenticate,
  authorize(USER_ROLES.PUBLISHER, USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  conversationController.getMessages
);

router.post(
  '/:id/messages',
  authenticate,
  authorize(USER_ROLES.PUBLISHER, USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  conversationController.sendMessage
);

router.patch(
  '/:id',
  authenticate,
  authorize(USER_ROLES.PUBLISHER, USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  conversationController.update
);

export default router;
