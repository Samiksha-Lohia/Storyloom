import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/env.js';
import userRepository from '../repositories/user.repository.js';
import { BadRequestError, ConflictError, UnauthorizedError, ForbiddenError } from '../utilities/custom-errors.js';
import { UserDto } from '../dtos/user.dto.js';
import { redis } from '../config/redis.js';
import { USER_ROLES, USER_STATUSES } from '../constants/user-roles.js';

/**
 * Parses JWT expiry string to seconds.
 */
const parseExpiryToSeconds = (expiry) => {
  if (typeof expiry === 'number') return expiry;
  if (!expiry) return 7 * 24 * 3600;
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 3600;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return value;
  }
};

/**
 * Signs a JWT access token.
 * Payload includes id, email, plan, role, status.
 */
const signAccessToken = (payload) =>
  jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      plan: payload.plan,
      role: payload.role,
      status: payload.status,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );

/**
 * Signs a JWT refresh token with a unique ID (jti).
 */
const signRefreshToken = (payload) =>
  jwt.sign(
    { sub: payload.id, jti: payload.jti },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );

/**
 * Returns a { accessToken, refreshToken } pair for the given user,
 * registering the refresh token's jti in Redis.
 */
const generateTokenPair = async (user) => {
  const userId = (user._id || user.id).toString();
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken({
    id: userId,
    email: user.email,
    plan: user.plan,
    role: user.role,
    status: user.status,
  });
  const refreshToken = signRefreshToken({ id: userId, jti });

  // Store refresh token in Redis
  const ttl = parseExpiryToSeconds(config.jwt.refreshExpiry);
  await redis.set(`refresh_token:${jti}`, userId, 'EX', ttl);

  return { accessToken, refreshToken };
};

// ─── Public Service Functions ─────────────────────────────────────────────────

/**
 * Register a new user account.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @param {object} [options] - { role, company, website, note }
 * @returns {Promise<{ user: UserDto, tokens: { accessToken, refreshToken } }>}
 */
const register = async (name, email, password, options = {}) => {
  const normalizedEmail = email ? email.toString().toLowerCase().trim() : '';
  const existing = await userRepository.findByEmail(normalizedEmail);
  if (existing) {
    throw new ConflictError('An account with this email already exists.');
  }

  const role = options.role || USER_ROLES.READER;
  if (role === USER_ROLES.ADMIN) {
    throw new BadRequestError('Admin accounts cannot be created via registration.');
  }

  let status = USER_STATUSES.ACTIVE;
  let publisherProfile = undefined;

  if (role === USER_ROLES.PUBLISHER) {
    status = USER_STATUSES.PENDING;
    if (!options.company || !options.website) {
      throw new BadRequestError('Publisher registration requires company name and website.');
    }
    publisherProfile = {
      company: options.company.toString().trim(),
      website: options.website.toString().trim(),
      note: options.note ? options.note.toString().trim() : '',
      reviewStatus: 'pending',
      approvedAt: null,
    };
  }

  try {
    const user = await userRepository.create({
      name,
      email: normalizedEmail,
      passwordHash: password,
      role,
      status,
      ...(publisherProfile && { publisherProfile }),
    });

    const tokens = await generateTokenPair(user);
    return { user: UserDto.toResponse(user), tokens };
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError('An account with this email or username already exists.');
    }
    throw err;
  }
};

/**
 * Authenticate a user with email + password.
 * Banned or suspended users get 403 Forbidden.
 * On invalid credentials, throws 401 without revealing if email exists.
 * @returns {Promise<{ user: UserDto, tokens: { accessToken, refreshToken } }>}
 */
const login = async (email, password) => {
  const normalizedEmail = email ? email.toString().toLowerCase().trim() : '';
  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  if (user.status === USER_STATUSES.BANNED) {
    throw new ForbiddenError('Your account has been banned due to terms violations.');
  }
  if (user.status === USER_STATUSES.SUSPENDED) {
    throw new ForbiddenError('Your account is currently suspended.');
  }

  const tokens = await generateTokenPair(user);
  return { user: UserDto.toResponse(user), tokens };
};

/**
 * Refresh the access token using a valid refresh token.
 * Re-reads the user so role/status changes take effect immediately.
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required.');
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }

  if (!payload.jti) {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }
  const storedUserId = await redis.get(`refresh_token:${payload.jti}`);
  if (!storedUserId) {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }

  // Re-read user from DB to pick up any role or status changes
  const user = await userRepository.findById(payload.sub);
  if (!user) {
    throw new UnauthorizedError('User not found.');
  }

  if (user.status === USER_STATUSES.BANNED || user.status === USER_STATUSES.SUSPENDED) {
    throw new ForbiddenError('Your account is suspended or banned.');
  }

  // Revoke old refresh token jti
  await redis.del(`refresh_token:${payload.jti}`);

  // Generate new token pair
  return generateTokenPair(user);
};

/**
 * Log out user by deleting the refresh token from Redis.
 */
const logout = async (refreshToken) => {
  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required.');
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }

  if (payload.jti) {
    await redis.del(`refresh_token:${payload.jti}`);
  }
};

export { register, login, refreshTokens, logout, generateTokenPair };
