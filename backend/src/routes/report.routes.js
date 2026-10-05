import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireActive } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createReportSchema,
  publicNoticeSchema,
} from '../validators/report.validator.js';
import * as reportController from '../controllers/report.controller.js';
import { ApiError } from '../utilities/custom-errors.js';

const router = Router();

// Rate limiter for in-app report submissions: 15 per hour per user/IP
const appReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:report:',
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id || 'anon'}`,
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many report submissions. Please try again later.'));
  },
});

// Strict rate limiter for unauthenticated public copyright notices: 5 per 15 minutes per IP
const publicNoticeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:report-public:',
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many public takedown notices from this IP. Please try again later.'));
  },
});

/**
 * POST /api/reports
 * In-app report submission by logged-in active users
 */
router.post(
  '/',
  authenticate,
  requireActive,
  appReportLimiter,
  validate(createReportSchema),
  reportController.createAppReport
);

/**
 * POST /api/reports/public-notice
 * Public takedown notice endpoint with honeypot and strict rate limiting
 */
router.post(
  '/public-notice',
  publicNoticeLimiter,
  validate(publicNoticeSchema),
  reportController.createPublicNotice
);

export default router;
