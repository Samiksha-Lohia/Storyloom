import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import * as authService from '../services/auth.service.js';
import userRepository from '../repositories/user.repository.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';
import { sendSuccess, sendCreated } from '../utilities/response.js';
import { redis } from '../config/redis.js';
import { ApiError, UnauthorizedError } from '../utilities/custom-errors.js';
import { UserDto } from '../dtos/user.dto.js';

import config from '../config/env.js';

const router = Router();

// Dedicated IP-only Rate Limiter for registration (10 per hour per IP by default, configurable)
const registerIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: config.rateLimit?.registerPerHour || 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:register-ip:',
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many accounts created from this IP address. Please try again after 1 hour.'));
  },
});

// Strict Rate Limiter: at least 10 attempts allowed per minute per IP + email identifier (configured to 30/min)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:auth-route:',
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => {
    const email = req.body?.email ? req.body.email.toString().toLowerCase().trim() : '';
    return `${ipKeyGenerator(req.ip)}:${email}`;
  },
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many login or registration attempts. Please try again after 1 minute.'));
  },
});

// Dedicated Rate Limiter for password reset requests (15 per minute per IP + email)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:forgot-pw:',
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => {
    const email = req.body?.email ? req.body.email.toString().toLowerCase().trim() : '';
    return `${ipKeyGenerator(req.ip)}:${email}`;
  },
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many password reset attempts. Please try again after 1 minute.'));
  },
});

/**
 * POST /api/auth/register
 * Body: { name, email, password, role?, company?, website?, note?, termsAccepted }
 */
router.post('/register', registerIpLimiter, authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role, company, website, note, termsAccepted } = req.body;
    const result = await authService.register(name, email, password, {
      role,
      company,
      website,
      note,
      termsAccepted,
    });
    sendCreated(res, result, 'Account created successfully.');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    sendSuccess(res, result, 200, 'Login successful.');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    sendSuccess(res, tokens, 200, 'Tokens refreshed.');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Body: { refreshToken }
 */
router.post('/logout', authenticate, validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    sendSuccess(res, null, 200, 'Logout successful.');
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    sendSuccess(res, result, 200, result.message);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 */
router.post('/reset-password', forgotPasswordLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    sendSuccess(res, result, 200, result.message);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user DTO (never the hash).
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new UnauthorizedError('User not found.');
    }
    sendSuccess(res, UserDto.toResponse(user), 200, 'User profile retrieved.');
  } catch (err) {
    next(err);
  }
});

export default router;
