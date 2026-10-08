import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize, requireActive } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { adminReportActionSchema } from '../validators/report.validator.js';
import {
  adminPublisherQuerySchema,
  adminPublisherActionSchema,
  adminUsersQuerySchema,
  adminUserUpdateSchema,
  adminBooksQuerySchema,
  adminBookUpdateSchema,
} from '../validators/admin.validator.js';
import * as adminController from '../controllers/admin.controller.js';
import * as conversationController from '../controllers/conversation.controller.js';
import { USER_ROLES } from '../constants/user-roles.js';

const router = Router();

router.use(authenticate, requireActive, authorize(USER_ROLES.ADMIN));

router.get('/stats', adminController.getStats);

router.get('/reports', adminController.getReports);

router.patch('/reports/:id', validate(adminReportActionSchema), adminController.handleReport);

router.get('/publishers', validate(adminPublisherQuerySchema), adminController.getPublishers);

router.patch('/publishers/:id', validate(adminPublisherActionSchema), adminController.reviewPublisher);

router.get('/users', validate(adminUsersQuerySchema), adminController.getUsers);

router.patch('/users/:id', validate(adminUserUpdateSchema), adminController.updateUser);

router.get('/books', validate(adminBooksQuerySchema), adminController.getBooks);

router.patch('/books/:id', validate(adminBookUpdateSchema), adminController.updateBook);

router.get('/conversations/:id', conversationController.adminGet);

export default router;
