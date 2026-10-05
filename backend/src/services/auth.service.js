import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/env.js';
import userRepository from '../repositories/user.repository.js';
import User from '../models/user.model.js';
import mailerService from './mailer.service.js';
import { BadRequestError, ConflictError, UnauthorizedError, ForbiddenError } from '../utilities/custom-errors.js';
import { UserDto } from '../dtos/user.dto.js';
import { redis } from '../config/redis.js';
import { USER_ROLES, USER_STATUSES } from '../constants/user-roles.js';
import { TERMS_VERSION } from '../constants/terms.js';

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
  await redis.sadd(`user_refresh_tokens:${userId}`, jti);
  await redis.expire(`user_refresh_tokens:${userId}`, ttl);

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

  if (options.termsAccepted === false) {
    throw new BadRequestError('You must accept the Terms of Service and Privacy Policy.');
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
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
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
    if (payload.sub) {
      await redis.srem(`user_refresh_tokens:${payload.sub}`, payload.jti);
    }
  }
};

/**
 * Invalidate all active refresh tokens for a specific user ID.
 * @param {string} userId
 */
const invalidateAllUserRefreshTokens = async (userId) => {
  const strId = userId.toString();
  try {
    const jtis = await redis.smembers(`user_refresh_tokens:${strId}`);
    if (jtis && jtis.length > 0) {
      const keys = jtis.map((jti) => `refresh_token:${jti}`);
      await redis.del(...keys);
      await redis.del(`user_refresh_tokens:${strId}`);
    }

    // Also scan as fallback in case any tokens were created without the set
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'refresh_token:*', 'COUNT', 100);
      cursor = nextCursor;
      for (const key of keys) {
        const val = await redis.get(key);
        if (val === strId) {
          await redis.del(key);
        }
      }
    } while (cursor !== '0');
  } catch (err) {
    // Non-blocking fallback
  }
};

/**
 * Generate password reset token, save hashed token with 30m expiry,
 * send email via mailer.service.js, and return generic response.
 * @param {string} email
 * @returns {Promise<{ message: string }>}
 */
const forgotPassword = async (email) => {
  const normalizedEmail = email ? email.toString().toLowerCase().trim() : '';
  const user = await userRepository.findByEmail(normalizedEmail);

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    const frontendBaseUrl = (config.frontendUrl || config.corsAllowedOrigins?.[0] || 'http://localhost:3000').replace(/\/+$/, '');
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${rawToken}`;

    await mailerService.sendEmail({
      to: user.email,
      subject: 'SceneCraft - Password Reset Request',
      text: `Hello ${user.name},\n\nYou requested a password reset. Please click the following link to reset your password (valid for 30 minutes):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password for your SceneCraft account. Click the button below to reset it. This link is valid for 30 minutes.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="color: #64748b; font-size: 14px; margin-top: 32px;">If you did not make this request, you can safely ignore this email.</p>
        </div>
      `,
    });
  }

  // Always return identical generic 200 response to avoid email enumeration
  return { message: 'If an account exists with this email, password reset instructions have been sent.' };
};

/**
 * Reset user password with token and invalidate all refresh tokens.
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<{ message: string }>}
 */
const resetPassword = async (token, newPassword) => {
  if (!token) {
    throw new BadRequestError('Reset token is required.');
  }

  const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new BadRequestError('Invalid or expired password reset token.');
  }

  // Update password (pre-save hook will hash passwordHash)
  user.passwordHash = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  // Invalidate all refresh tokens for this user
  await invalidateAllUserRefreshTokens(user._id.toString());

  return { message: 'Password has been reset successfully. Please log in with your new password.' };
};

export {
  register,
  login,
  refreshTokens,
  logout,
  generateTokenPair,
  forgotPassword,
  resetPassword,
  invalidateAllUserRefreshTokens,
};

