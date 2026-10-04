import { ForbiddenError, UnauthorizedError } from '../utilities/custom-errors.js';
import { USER_STATUSES } from '../constants/user-roles.js';

/**
 * Middleware factory to authorize users by role.
 * Usage: router.get('/path', authenticate, authorize('admin', 'writer'), handler)
 * @param  {...string} roles
 */
export const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }

    next();
  };
};

/**
 * Middleware to ensure the authenticated user has an active status (not banned or suspended).
 * Usage: router.post('/path', authenticate, requireActive, handler)
 */
export const requireActive = (req, _res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required.'));
  }

  if (req.user.status === USER_STATUSES.BANNED || req.user.status === USER_STATUSES.SUSPENDED) {
    return next(new ForbiddenError('Your account is suspended or banned.'));
  }

  next();
};

/**
 * Middleware to ensure the publisher is approved.
 * If publisher status is pending, returns 403 with error code 'PUBLISHER_PENDING'.
 */
export const requireApprovedPublisher = (req, _res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required.'));
  }

  if (req.user.role !== 'publisher') {
    return next(new ForbiddenError('Publisher access required.'));
  }

  if (req.user.status === USER_STATUSES.PENDING) {
    const error = new ForbiddenError('Publisher application pending approval.');
    error.code = 'PUBLISHER_PENDING';
    return next(error);
  }

  if (req.user.status !== USER_STATUSES.ACTIVE) {
    return next(new ForbiddenError('Publisher account is not active.'));
  }

  next();
};

export default {
  authorize,
  requireActive,
  requireApprovedPublisher,
};
