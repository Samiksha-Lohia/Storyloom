import { redis } from '../config/redis.js';
import ViewEvent from '../models/view-event.model.js';
import { getDayString, getViewerKey } from '../utilities/viewer-key.js';
import logger from '../utilities/logger.js';

/**
 * Record a book_view event server-side.
 * Deduplicated once per viewer per book per day.
 *
 * @param {string|mongoose.Types.ObjectId} bookId
 * @param {import('express').Request} req
 */
export const recordBookView = async (bookId, req) => {
  if (!bookId) return;
  try {
    const day = getDayString();
    const viewerKey = getViewerKey(req, day);

    // Fast-path deduplication with Redis to avoid redundant MongoDB writes
    const redisKey = `view:book:${bookId}:${viewerKey}:${day}`;
    const acquired = await redis.set(redisKey, '1', 'EX', 86400 * 2, 'NX');
    if (!acquired) {
      return; // Already recorded today
    }

    await ViewEvent.create({
      type: 'book_view',
      targetId: bookId,
      viewerKey,
      day,
    }).catch((err) => {
      // Ignore duplicate key race condition
      if (err.code !== 11000) {
        logger.error(`Error recording book_view: ${err.message}`);
      }
    });
  } catch (err) {
    logger.error(`recordBookView failed: ${err.message}`);
  }
};

/**
 * Record a profile_view event server-side.
 * Deduplicated once per viewer per writer per day.
 * Skips self-views by the writer themself.
 *
 * @param {string|mongoose.Types.ObjectId} writerId
 * @param {import('express').Request} req
 */
export const recordProfileView = async (writerId, req) => {
  if (!writerId) return;
  try {
    const day = getDayString();
    const viewerKey = getViewerKey(req, day);

    // Skip counting self-views
    if (req.user?.id && req.user.id.toString() === writerId.toString()) {
      return;
    }

    const redisKey = `view:profile:${writerId}:${viewerKey}:${day}`;
    const acquired = await redis.set(redisKey, '1', 'EX', 86400 * 2, 'NX');
    if (!acquired) {
      return; // Already recorded today
    }

    await ViewEvent.create({
      type: 'profile_view',
      targetId: writerId,
      viewerKey,
      day,
    }).catch((err) => {
      if (err.code !== 11000) {
        logger.error(`Error recording profile_view: ${err.message}`);
      }
    });
  } catch (err) {
    logger.error(`recordProfileView failed: ${err.message}`);
  }
};

/**
 * Record an active user event at most once per user per day.
 * Guarded with Redis SET NX so it incurs no DB write on subsequent requests.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 */
export const recordActiveUser = async (userId) => {
  if (!userId) return;
  try {
    const day = getDayString();
    const viewerKey = userId.toString();

    const redisKey = `user:active:${userId}:${day}`;
    const acquired = await redis.set(redisKey, '1', 'EX', 86400 * 2, 'NX');
    if (!acquired) {
      return; // Already recorded today
    }

    await ViewEvent.create({
      type: 'active',
      targetId: userId,
      viewerKey,
      day,
    }).catch((err) => {
      if (err.code !== 11000) {
        logger.error(`Error recording active view event: ${err.message}`);
      }
    });
  } catch (err) {
    logger.error(`recordActiveUser failed: ${err.message}`);
  }
};

export default {
  recordBookView,
  recordProfileView,
  recordActiveUser,
};
