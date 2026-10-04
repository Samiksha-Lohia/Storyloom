import * as reviewService from '../services/review.service.js';
import { sendSuccess, sendCreated } from '../utilities/response.js';

export const createReview = async (req, res, next) => {
  try {
    const review = await reviewService.createReview({
      readerId: req.user.id,
      bookId: req.params.bookId,
      rating: req.body.rating,
      text: req.body.text,
      userRole: req.user.role,
    });
    sendCreated(res, review, 'Review created successfully.');
  } catch (err) {
    next(err);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const review = await reviewService.updateReview({
      reviewId: req.params.reviewId,
      readerId: req.user.id,
      userRole: req.user.role,
      rating: req.body.rating,
      text: req.body.text,
    });
    sendSuccess(res, review, 200, 'Review updated successfully.');
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const result = await reviewService.deleteReview({
      reviewId: req.params.reviewId,
      readerId: req.user.id,
      userRole: req.user.role,
    });
    sendSuccess(res, null, 200, result.message);
  } catch (err) {
    next(err);
  }
};

export const getBookReviews = async (req, res, next) => {
  try {
    const result = await reviewService.getBookReviews(req.params.bookId, {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      currentUserId: req.user?.id || null,
    });
    sendSuccess(res, result, 200, 'Reviews retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const markReviewRead = async (req, res, next) => {
  try {
    const review = await reviewService.markReviewRead({
      reviewId: req.params.id || req.params.reviewId,
      bookId: req.params.bookId || null,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });
    sendSuccess(res, review, 200, 'Review marked as read.');
  } catch (err) {
    next(err);
  }
};

export default {
  createReview,
  updateReview,
  deleteReview,
  getBookReviews,
  markReviewRead,
};
