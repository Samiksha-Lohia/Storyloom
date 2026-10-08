import mongoose from 'mongoose';
import Review from '../models/review.model.js';
import Book from '../models/book.model.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../utilities/custom-errors.js';
import { USER_ROLES } from '../constants/user-roles.js';
import { createNotification } from './notification.service.js';

export const stripControlChars = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
};

export const recomputeBookRatingStats = async (bookId) => {
  const objectId = typeof bookId === 'string' ? new mongoose.Types.ObjectId(bookId) : bookId;

  const result = await Review.aggregate([
    {
      $match: {
        bookId: objectId,
        status: 'visible',
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingAvg = result.length > 0 ? Math.round(result[0].avg * 10) / 10 : 0;
  const ratingCount = result.length > 0 ? result[0].count : 0;

  await Book.findByIdAndUpdate(objectId, {
    'stats.ratingAvg': ratingAvg,
    'stats.ratingCount': ratingCount,
  });

  return { ratingAvg, ratingCount };
};

export const createReview = async ({ readerId, bookId, rating, text = '', userRole }) => {
  if (userRole === USER_ROLES.PUBLISHER) {
    throw new ForbiddenError('Publishers cannot post reviews.');
  }

  const book = await Book.findById(bookId);
  if (!book || book.status === 'removed') {
    throw new NotFoundError('Book not found.');
  }

  if (book.writerId.toString() === readerId.toString()) {
    throw new ForbiddenError('You cannot review your own book.');
  }

  const existing = await Review.findOne({ readerId, bookId });
  if (existing) {
    throw new ConflictError('You have already reviewed this book.');
  }

  const numericRating = Number(rating);
  if (!numericRating || numericRating < 1 || numericRating > 5) {
    throw new BadRequestError('Rating must be between 1 and 5.');
  }

  const cleanText = stripControlChars(text);

  let review;
  try {
    review = await Review.create({
      readerId,
      bookId,
      rating: numericRating,
      text: cleanText,
      status: 'visible',
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError('You have already reviewed this book.');
    }
    throw err;
  }

  await recomputeBookRatingStats(bookId);

  try {
    if (book.writerId && book.writerId.toString() !== readerId.toString()) {
      await createNotification({
        recipientId: book.writerId,
        type: 'review_received',
        title: 'New Review on Your Book',
        message: `A reader left a ${numericRating}-star review on "${book.title}".`,
        data: { bookId: book._id, reviewId: review._id, rating: numericRating },
      });
    }
  } catch (_e) {
  }

  return Review.findById(review._id).populate('readerId', 'name username avatarUrl');
};

export const updateReview = async ({ reviewId, readerId, userRole, rating, text }) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError('Review not found.');
  }

  if (review.readerId.toString() !== readerId.toString() && userRole !== USER_ROLES.ADMIN) {
    throw new ForbiddenError('You can only edit your own review.');
  }

  if (rating !== undefined) {
    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      throw new BadRequestError('Rating must be between 1 and 5.');
    }
    review.rating = numericRating;
  }

  if (text !== undefined) {
    review.text = stripControlChars(text);
  }

  await review.save();
  await recomputeBookRatingStats(review.bookId);

  return Review.findById(review._id).populate('readerId', 'name username avatarUrl');
};

export const deleteReview = async ({ reviewId, readerId, userRole }) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new NotFoundError('Review not found.');
  }

  if (review.readerId.toString() !== readerId.toString() && userRole !== USER_ROLES.ADMIN) {
    throw new ForbiddenError('You can only delete your own review.');
  }

  const bookId = review.bookId;
  await Review.findByIdAndDelete(reviewId);
  await recomputeBookRatingStats(bookId);

  return { message: 'Review deleted successfully.' };
};

export const getBookReviews = async (bookId, { page = 1, limit = 10, sort = 'newest', currentUserId = null } = {}) => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (numericPage - 1) * numericLimit;

  let sortOption = { createdAt: -1 };
  if (sort === 'highest') sortOption = { rating: -1, createdAt: -1 };
  if (sort === 'lowest') sortOption = { rating: 1, createdAt: -1 };

  const query = { bookId, status: 'visible' };

  const [reviews, total, rawHistogram, userReview] = await Promise.all([
    Review.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(numericLimit)
      .populate('readerId', 'name username avatarUrl')
      .lean(),
    Review.countDocuments(query),
    Review.aggregate([
      { $match: { bookId: new mongoose.Types.ObjectId(bookId), status: 'visible' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
    currentUserId
      ? Review.findOne({ bookId, readerId: currentUserId })
          .populate('readerId', 'name username avatarUrl')
          .lean()
      : null,
  ]);

  const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rawHistogram.forEach((item) => {
    if (histogram[item._id] !== undefined) {
      histogram[item._id] = item.count;
    }
  });

  return {
    reviews,
    userReview,
    stats: {
      ratingAvg: book.stats?.ratingAvg || 0,
      ratingCount: book.stats?.ratingCount || 0,
      histogram,
    },
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit),
    },
  };
};

export const markReviewRead = async ({ reviewId, bookId, requesterId, requesterRole }) => {
  const query = { _id: reviewId };
  if (bookId) query.bookId = bookId;
  const review = await Review.findOne(query);
  if (!review) throw new NotFoundError('Review not found.');

  const book = await Book.findById(review.bookId).select('writerId').lean();
  if (!book) throw new NotFoundError('Book not found.');

  const isWriter = book.writerId?.toString() === requesterId.toString();
  const isAdmin = requesterRole === USER_ROLES.ADMIN;
  if (!isWriter && !isAdmin) throw new ForbiddenError('Only the book author can mark reviews as read.');

  review.readByWriter = true;
  await review.save();
  return review;
};

export default {

  recomputeBookRatingStats,
  createReview,
  updateReview,
  deleteReview,
  getBookReviews,
  markReviewRead,
};

