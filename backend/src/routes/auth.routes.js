import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import * as authService from '../services/auth.service.js';
import userRepository from '../repositories/user.repository.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.validator.js';
import { sendSuccess, sendCreated } from '../utilities/response.js';
import { redis } from '../config/redis.js';
import { ApiError, UnauthorizedError } from '../utilities/custom-errors.js';
import { UserDto } from '../dtos/user.dto.js';

const router = Router();

// Strict Rate Limiter: at least 10 attempts allowed per minute per IP + email identifier (configured to 30/min)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
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

/**
 * POST /api/auth/register
 * Body: { name, email, password, role?, company?, website?, note? }
 */
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role, company, website, note } = req.body;
    const result = await authService.register(name, email, password, {
      role,
      company,
      website,
      note,
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
