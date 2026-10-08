import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { UnauthorizedError } from '../utilities/custom-errors.js';
import { recordActiveUser } from '../services/event.service.js';

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

    recordActiveUser(req.user.id).catch(() => {});

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError('Invalid or expired access token.'));
  }
};

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

