import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { UnauthorizedError } from '../utilities/custom-errors.js';
import { recordActiveUser } from '../services/event.service.js';

/**
 * Verifies the Bearer JWT access token in the Authorization header.
 * Attaches `req.user = { id, email, plan, role, status }` on success.
 */
const authenticate = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token missing or malformed.');
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.accessSecret);

    req.user = {
      id: payload.sub,
      email: payload.email,
      plan: payload.plan,
      role: payload.role,
      status: payload.status,
    };

    // Record active event at most once per user per day (Redis SET NX guarded)
    recordActiveUser(req.user.id).catch(() => {});

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    // JsonWebTokenError / TokenExpiredError
    next(new UnauthorizedError('Invalid or expired access token.'));
  }
};

/**
 * Optional authentication: attaches req.user if valid token is provided,
 * but allows unauthenticated requests to proceed with req.user = null.
 */
const authenticateOptional = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.accessSecret);

    req.user = {
      id: payload.sub,
      email: payload.email,
      plan: payload.plan,
      role: payload.role,
      status: payload.status,
    };

    recordActiveUser(req.user.id).catch(() => {});

    next();
  } catch (_err) {
    req.user = null;
    next();
  }
};

export { authenticate, authenticateOptional };

