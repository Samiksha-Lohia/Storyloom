import { Router } from 'express';
import * as publishRequestController from '../controllers/publishRequest.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  authorize,
  requireActive,
  requireApprovedPublisher,
} from '../middleware/rbac.middleware.js';
import { USER_ROLES } from '../constants/user-roles.js';

const router = Router();

// Create publish request: approved publisher only
router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.PUBLISHER),
  requireActive,
  requireApprovedPublisher,
  publishRequestController.create
);

// List publish requests: publisher, writer, or admin
router.get(
  '/',
  authenticate,
  authorize(USER_ROLES.PUBLISHER, USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  publishRequestController.list
);

// Get publish request by ID: participants or admin
router.get(
  '/:id',
  authenticate,
  authorize(USER_ROLES.PUBLISHER, USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  publishRequestController.getById
);

// Update request status (accept, decline, withdraw, close)
router.patch(
  '/:id',
  authenticate,
  authorize(USER_ROLES.PUBLISHER, USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  publishRequestController.updateStatus
);

// Blocking endpoints for writers
router.get(
  '/blocks/all',
  authenticate,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  publishRequestController.listBlockedPublishers
);

router.put(
  '/blocks/:publisherId',
  authenticate,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  publishRequestController.blockPublisher
);

router.delete(
  '/blocks/:publisherId',
  authenticate,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  requireActive,
  publishRequestController.unblockPublisher
);

export default router;
