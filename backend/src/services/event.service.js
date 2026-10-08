import { redis } from '../config/redis.js';
import ViewEvent from '../models/view-event.model.js';
import { getDayString, getViewerKey } from '../utilities/viewer-key.js';
import logger from '../utilities/logger.js';

export const recordBookView = async (bookId, req) => {
  if (!bookId) return;
  try {
    const day = getDayString();
    const viewerKey = getViewerKey(req, day);

    const redisKey = `view:book:${bookId}:${viewerKey}:${day}`;
    const acquired = await redis.set(redisKey, '1', 'EX', 86400 * 2, 'NX');
    if (!acquired) {
      return;
    }

    await ViewEvent.create({
      type: 'book_view',
      targetId: bookId,
      viewerKey,
      day,
    }).catch((err) => {
      if (err.code !== 11000) {
        logger.error(`Error recording book_view: ${err.message}`);
      }
    });
  } catch (err) {
    logger.error(`recordBookView failed: ${err.message}`);
  }
};

export const recordProfileView = async (writerId, req) => {
  if (!writerId) return;
  try {
    const day = getDayString();
    const viewerKey = getViewerKey(req, day);

    if (req.user?.id && req.user.id.toString() === writerId.toString()) {
      return;
    }

    const redisKey = `view:profile:${writerId}:${viewerKey}:${day}`;
    const acquired = await redis.set(redisKey, '1', 'EX', 86400 * 2, 'NX');
    if (!acquired) {
      return;
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

export const recordActiveUser = async (userId) => {
  if (!userId) return;
  try {
    const day = getDayString();
    const viewerKey = userId.toString();

    const redisKey = `user:active:${userId}:${day}`;
    const acquired = await redis.set(redisKey, '1', 'EX', 86400 * 2, 'NX');
    if (!acquired) {
      return;
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
