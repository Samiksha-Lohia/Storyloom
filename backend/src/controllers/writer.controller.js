import writerService from '../services/writer.service.js';
import { recordProfileView } from '../services/event.service.js';
import { sendSuccess } from '../utilities/response.js';

export const getAnalytics = async (req, res, next) => {
  try {
    const range = parseInt(req.query.range, 10) || 30;
    const bookId = req.query.bookId || null;
    const analytics = await writerService.getWriterAnalytics({
      writerId: req.user.id,
      range,
      bookId,
      userRole: req.user.role,
    });
    sendSuccess(res, analytics, 200, 'Writer analytics retrieved.');
  } catch (err) {
    next(err);
  }
};

export const getDropOffExplain = async (req, res, next) => {
  try {
    const bookId = req.query.bookId || null;
    const explainPlan = await writerService.explainDropOffAggregation({
      writerId: req.user.id,
      bookId,
    });
    sendSuccess(res, explainPlan, 200, 'Drop-off explain execution plan.');
  } catch (err) {
    next(err);
  }
};

export const getReviews = async (req, res, next) => {
  try {
    const { bookId, rating, unreadOnly, page, limit } = req.query;
    const result = await writerService.getWriterReviews({
      writerId: req.user.id,
      bookId: bookId || null,
      rating: rating ? parseInt(rating, 10) : null,
      unreadOnly: unreadOnly === 'true' || unreadOnly === true,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });
    sendSuccess(res, result, 200, 'Writer reviews retrieved.');
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const identifier = req.params.username || req.params.id;
    const currentUserId = req.user?.id || req.user?._id || null;
    const result = await writerService.getWriterProfile(identifier, currentUserId);

    if (result.writer?.id) {
      await recordProfileView(result.writer.id, req);
    }

    sendSuccess(res, result, 200, 'Writer profile retrieved.');
  } catch (err) {
    next(err);
  }
};

export const followWriter = async (req, res, next) => {
  try {
    const { username } = req.params;
    const result = await writerService.followWriter(req.user.id, username);
    sendSuccess(res, result, 200, `You are now following @${username}.`);
  } catch (err) {
    next(err);
  }
};

export const unfollowWriter = async (req, res, next) => {
  try {
    const { username } = req.params;
    const result = await writerService.unfollowWriter(req.user.id, username);
    sendSuccess(res, result, 200, `You unfollowed @${username}.`);
  } catch (err) {
    next(err);
  }
};

export default {
  getAnalytics,
  getDropOffExplain,
  getReviews,
  getProfile,
  followWriter,
  unfollowWriter,
};

