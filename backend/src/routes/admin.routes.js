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

// All admin routes require authentication, active account status, and admin role
router.use(authenticate, requireActive, authorize(USER_ROLES.ADMIN));

/**
 * GET /api/admin/stats
 * C1. Platform-wide telemetry, DAU/WAU, KPIs, and top content
 */
router.get('/stats', adminController.getStats);

/**
 * GET /api/admin/reports
 * Moderation reports queue with filters and pagination
 */
router.get('/reports', adminController.getReports);

/**
 * PATCH /api/admin/reports/:id
 * Apply moderation action: dismiss, unpublish_book, remove_review, strike_user
 */
router.patch('/reports/:id', validate(adminReportActionSchema), adminController.handleReport);

/**
 * GET /api/admin/publishers
 * List publisher applicants (status=pending|approved|rejected|all)
 */
router.get('/publishers', validate(adminPublisherQuerySchema), adminController.getPublishers);

/**
 * PATCH /api/admin/publishers/:id
 * Approve or reject publisher applicant
 */
router.patch('/publishers/:id', validate(adminPublisherActionSchema), adminController.reviewPublisher);

/**
 * GET /api/admin/users
 * C2. Search, filter, and paginate users with activity and report metrics
 */
router.get('/users', validate(adminUsersQuerySchema), adminController.getUsers);

/**
 * PATCH /api/admin/users/:id
 * C2. Change role, ban/unban, suspend user with auto-book takedown
 */
router.patch('/users/:id', validate(adminUserUpdateSchema), adminController.updateUser);

/**
 * GET /api/admin/books
 * C2. Search, filter, and paginate books for administrative review
 */
router.get('/books', validate(adminBooksQuerySchema), adminController.getBooks);

/**
 * PATCH /api/admin/books/:id
 * C2. Moderation action: unpublish, suspend, restore
 */
router.patch('/books/:id', validate(adminBookUpdateSchema), adminController.updateBook);

/**
 * GET /api/admin/conversations/:id?reportId=
 * Inspect conversation under active report audit
 */
router.get('/conversations/:id', conversationController.adminGet);

export default router;
