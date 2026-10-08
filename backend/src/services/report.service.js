import Report from '../models/report.model.js';
import Book from '../models/book.model.js';
import Review from '../models/review.model.js';
import User from '../models/user.model.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utilities/custom-errors.js';
import { stripControlChars, recomputeBookRatingStats } from './review.service.js';
import { logAction } from './audit.service.js';
import { createNotification } from './notification.service.js';
import { BOOK_STATUSES } from '../constants/book.js';
import { USER_STATUSES } from '../constants/user-roles.js';

export const createAppReport = async ({
  reporterId,
  targetType,
  targetId,
  reason,
  details = '',
  claimantName = null,
  claimantContact = null,
}) => {
  const existingActive = await Report.findOne({
    reporterId,
    targetType,
    targetId,
    status: { $in: ['open', 'reviewing'] },
  });

  if (existingActive) {
    throw new ConflictError('You have already submitted a pending report for this item.');
  }

  if (targetType === 'book') {
    const book = await Book.findById(targetId);
    if (!book) throw new NotFoundError('Target book not found.');
  } else if (targetType === 'review') {
    const review = await Review.findById(targetId);
    if (!review) throw new NotFoundError('Target review not found.');
  } else if (targetType === 'user') {
    const user = await User.findById(targetId);
    if (!user) throw new NotFoundError('Target user not found.');
  }

  if (reason === 'copyright' && (!claimantName || !claimantContact)) {
    throw new BadRequestError('Claimant name and contact information are required for copyright reports.');
  }

  const cleanDetails = stripControlChars(details);

  const report = await Report.create({
    reporterId,
    targetType,
    targetId,
    reason,
    details: cleanDetails,
    claimantName: claimantName ? stripControlChars(claimantName) : null,
    claimantContact: claimantContact ? stripControlChars(claimantContact) : null,
    source: 'app',
    status: 'open',
  });

  return report;
};

export const createPublicNotice = async ({
  targetType = 'book',
  targetId,
  reason = 'copyright',
  details = '',
  claimantName,
  claimantContact,
  honeypot = null,
}) => {
  if (honeypot && typeof honeypot === 'string' && honeypot.trim().length > 0) {
    throw new BadRequestError('Bot submission detected.');
  }

  if (!claimantName || !claimantContact) {
    throw new BadRequestError('Claimant name and contact information are required.');
  }

  if (targetType === 'book') {
    const book = await Book.findById(targetId);
    if (!book) throw new NotFoundError('Target book not found.');
  }

  const cleanDetails = stripControlChars(details);

  const report = await Report.create({
    reporterId: null,
    targetType,
    targetId,
    reason,
    details: cleanDetails,
    claimantName: stripControlChars(claimantName),
    claimantContact: stripControlChars(claimantContact),
    source: 'public',
    status: 'open',
  });

  return report;
};

export const getReports = async ({
  status,
  targetType,
  reason,
  page = 1,
  limit = 20,
} = {}) => {
  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }
  if (targetType) {
    query.targetType = targetType;
  }
  if (reason) {
    query.reason = reason;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [reports, total] = await Promise.all([
    Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .populate('reporterId', 'name username email')
      .populate('handledBy', 'name username')
      .lean(),
    Report.countDocuments(query),
  ]);

  return {
    reports,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit),
    },
  };
};

export const handleReportAction = async (reportId, { adminUser, action, notes = '' }) => {
  const report = await Report.findById(reportId);
  if (!report) {
    throw new NotFoundError('Report not found.');
  }

  const validActions = ['dismiss', 'unpublish_book', 'remove_review', 'strike_user'];
  if (!validActions.includes(action)) {
    throw new BadRequestError(`Invalid action "${action}". Must be one of: ${validActions.join(', ')}`);
  }

  const cleanNotes = stripControlChars(notes);

  if (action === 'dismiss') {
    await logAction({
      actor: adminUser.id || adminUser._id,
      action: 'report_dismiss',
      targetType: 'report',
      targetId: report._id,
      meta: { reason: report.reason, notes: cleanNotes },
    });
  } else if (action === 'unpublish_book') {
    const book = await Book.findById(report.targetId);
    if (book) {
      book.status = BOOK_STATUSES.REMOVED;
      await book.save();

      await logAction({
        actor: adminUser.id || adminUser._id,
        action: 'book_unpublish',
        targetType: 'book',
        targetId: book._id,
        meta: { title: book.title, notes: cleanNotes },
      });

      if (book.writerId) {
        await createNotification({
          recipientId: book.writerId,
          type: 'book_removed',
          title: 'Book Removed',
          message: `Your book "${book.title}" was removed following a moderation review.`,
          data: { bookId: book._id, reportId: report._id },
        });
      }
    }
  } else if (action === 'remove_review') {
    const review = await Review.findById(report.targetId);
    if (review) {
      review.status = 'removed';
      await review.save();
      await recomputeBookRatingStats(review.bookId);

      await logAction({
        actor: adminUser.id || adminUser._id,
        action: 'review_remove',
        targetType: 'review',
        targetId: review._id,
        meta: { bookId: review.bookId, notes: cleanNotes },
      });

      if (review.readerId) {
        await createNotification({
          recipientId: review.readerId,
          type: 'review_removed',
          title: 'Review Removed',
          message: 'Your review was removed for violating community guidelines.',
          data: { reviewId: review._id, reportId: report._id },
        });
      }
    }
  } else if (action === 'strike_user') {
    let targetUser = null;
    if (report.targetType === 'user') {
      targetUser = await User.findById(report.targetId);
    } else if (report.targetType === 'book') {
      const book = await Book.findById(report.targetId);
      if (book?.writerId) targetUser = await User.findById(book.writerId);
    } else if (report.targetType === 'review') {
      const review = await Review.findById(report.targetId);
      if (review?.readerId) targetUser = await User.findById(review.readerId);
    }

    if (!targetUser) {
      throw new NotFoundError('Target user to strike could not be found.');
    }

    targetUser.strikes = (targetUser.strikes || 0) + 1;

    if (targetUser.strikes >= 3) {
      targetUser.status = USER_STATUSES.SUSPENDED;
      await Book.updateMany(
        { writerId: targetUser._id, status: BOOK_STATUSES.PUBLISHED },
        { status: BOOK_STATUSES.REMOVED }
      );

      await logAction({
        actor: adminUser.id || adminUser._id,
        action: 'user_suspend',
        targetType: 'user',
        targetId: targetUser._id,
        meta: { strikes: targetUser.strikes, notes: cleanNotes },
      });

      await createNotification({
        recipientId: targetUser._id,
        type: 'account_suspended',
        title: 'Account Suspended',
        message: 'Your account has received 3 strikes and has been suspended. All published books have been taken down. To appeal, please contact support@scenecraft.com.',
        data: { strikes: targetUser.strikes, reportId: report._id },
      });
    } else {
      await logAction({
        actor: adminUser.id || adminUser._id,
        action: 'user_strike',
        targetType: 'user',
        targetId: targetUser._id,
        meta: { strikes: targetUser.strikes, notes: cleanNotes },
      });

      await createNotification({
        recipientId: targetUser._id,
        type: 'strike_received',
        title: 'Community Strike Received',
        message: `Your account has received a strike (${targetUser.strikes}/3). If you believe this is an error, please contact support@scenecraft.com to appeal.`,
        data: { strikes: targetUser.strikes, reportId: report._id },
      });
    }

    await targetUser.save();
  }

  report.status = 'closed';
  report.handledBy = adminUser.id || adminUser._id;
  report.handledAt = new Date();
  report.outcome = action === 'dismiss' ? 'dismissed' : action;
  report.adminNotes = cleanNotes;
  await report.save();

  return report;
};

export default {
  createAppReport,
  createPublicNotice,
  getReports,
  handleReportAction,
};
