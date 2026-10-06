import User from '../models/user.model.js';
import Book from '../models/book.model.js';
import Review from '../models/review.model.js';
import Report from '../models/report.model.js';
import ViewEvent from '../models/view-event.model.js';
import Follow from '../models/follow.model.js';
import { UserDto } from '../dtos/user.dto.js';
import { USER_ROLES, USER_STATUSES } from '../constants/user-roles.js';
import { BOOK_STATUSES } from '../constants/book.js';
import { NotFoundError, BadRequestError } from '../utilities/custom-errors.js';
import { logAction } from './audit.service.js';
import { createNotification } from './notification.service.js';
import { invalidateCatalogueCache } from './book.service.js';

/**
 * C1. Comprehensive platform statistics for Admin Dashboard.
 */
export const getAdminStats = async () => {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    rolesAggregation,
    signups7d,
    signups30d,
    signupsTotal,
    dauEvents,
    wauEvents,
    publishedBooksCount,
    readsAggregation,
    totalReviewsCount,
    pendingPublishersCount,
    openReportsCount,
    topBooks,
  ] = await Promise.all([
    // Users by role
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    // Signups
    User.countDocuments({ createdAt: { $gte: d7 } }),
    User.countDocuments({ createdAt: { $gte: d30 } }),
    User.countDocuments(),
    // Active users (DAU / WAU from ViewEvent distinct viewers, with fallback to lastActiveAt)
    ViewEvent.distinct('viewerKey', { createdAt: { $gte: d1 } }),
    ViewEvent.distinct('viewerKey', { createdAt: { $gte: d7 } }),
    // Published books
    Book.countDocuments({ status: BOOK_STATUSES.PUBLISHED }),
    // Reads aggregate
    Book.aggregate([
      { $match: { status: BOOK_STATUSES.PUBLISHED } },
      { $group: { _id: null, totalReads: { $sum: '$stats.reads' } } },
    ]),
    // Reviews
    Review.countDocuments(),
    // Pending publishers
    User.countDocuments({ 'publisherProfile.reviewStatus': 'pending' }),
    // Open reports
    Report.countDocuments({ status: 'pending' }),
    // Top 5 books by reads
    Book.find({ status: BOOK_STATUSES.PUBLISHED })
      .sort({ 'stats.reads': -1, 'stats.ratingAvg': -1 })
      .limit(5)
      .populate('writerId', 'name username')
      .select('title coverUrl genre stats writerId createdAt')
      .lean(),
  ]);

  // Map roles into a friendly object
  const usersByRole = {
    reader: 0,
    writer: 0,
    publisher: 0,
    admin: 0,
  };
  rolesAggregation.forEach((r) => {
    if (r._id && usersByRole[r._id] !== undefined) {
      usersByRole[r._id] = r.count;
    }
  });

  // Calculate top writers by published book count or total reads
  const topWritersAgg = await Book.aggregate([
    { $match: { status: BOOK_STATUSES.PUBLISHED } },
    {
      $group: {
        _id: '$writerId',
        totalReads: { $sum: '$stats.reads' },
        booksCount: { $sum: 1 },
      },
    },
    { $sort: { totalReads: -1, booksCount: -1 } },
    { $limit: 5 },
  ]);

  const topWriterIds = topWritersAgg.map((w) => w._id);
  const topWriterDocs = await User.find({ _id: { $in: topWriterIds } })
    .select('name username avatarUrl')
    .lean();

  const topWriters = topWritersAgg.map((w) => {
    const doc = topWriterDocs.find((u) => u._id.toString() === w._id.toString());
    return {
      _id: w._id,
      name: doc?.name || 'Unknown',
      username: doc?.username || 'writer',
      avatarUrl: doc?.avatarUrl || null,
      totalReads: w.totalReads || 0,
      booksCount: w.booksCount || 0,
    };
  });

  // Calculate manuscript lifecycle status distribution
  const statusDistributionAgg = await Book.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
  const statusDistribution = {
    draft: 0,
    processing: 0,
    published: 0,
    unpublished: 0,
    removed: 0,
  };
  statusDistributionAgg.forEach((s) => {
    if (s._id in statusDistribution) {
      statusDistribution[s._id] = s.count;
    }
  });

  return {
    usersByRole,
    signups: {
      last7d: signups7d,
      last30d: signups30d,
      allTime: signupsTotal,
    },
    activeUsers: {
      dau: dauEvents?.length || 0,
      wau: wauEvents?.length || 0,
    },
    books: {
      publishedCount: publishedBooksCount,
      totalReads: readsAggregation[0]?.totalReads || 0,
      totalReviews: totalReviewsCount,
      statusDistribution,
    },
    pendingPublishersCount,
    openReportsCount,
    topBooks,
    topWriters,
  };
};

/**
 * List publisher applicants with optional reviewStatus filter.
 */
export const getPublishers = async ({ status = 'pending', page = 1, limit = 20 } = {}) => {
  const query = {};

  if (status === 'all') {
    query.$or = [
      { role: USER_ROLES.PUBLISHER },
      { 'publisherProfile.reviewStatus': { $exists: true } },
    ];
  } else if (status) {
    query['publisherProfile.reviewStatus'] = status;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    results: UserDto.toResponseList(users),
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit) || 1,
    },
  };
};

/**
 * Approve or reject a publisher application.
 */
export const reviewPublisher = async (userId, { action, reason, adminUser }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found.');
  }

  if (!user.publisherProfile) {
    user.publisherProfile = {
      company: '',
      website: '',
      note: '',
      reviewStatus: 'pending',
    };
  }

  const adminId = adminUser?.id || adminUser?._id || 'admin';

  if (action === 'approve') {
    user.status = USER_STATUSES.ACTIVE;
    user.role = USER_ROLES.PUBLISHER;
    user.publisherProfile.reviewStatus = 'approved';
    user.publisherProfile.approvedAt = new Date();
    user.publisherProfile.rejectionReason = null;

    await user.save();

    await logAction({
      actor: adminId,
      action: 'publisher_approved',
      targetType: 'user',
      targetId: user._id,
      meta: {
        company: user.publisherProfile.company,
        website: user.publisherProfile.website,
      },
    });

    await createNotification({
      recipientId: user._id,
      type: 'publisher_approved',
      title: 'Publisher Application Approved',
      message: 'Congratulations! Your publisher account has been approved. You now have full access to discover books, view pitch panels, and curate your wishlist.',
      data: {
        role: 'publisher',
        reviewStatus: 'approved',
      },
    });

    return UserDto.toResponse(user);
  }

  if (action === 'reject') {
    const finalReason = (reason || 'Application does not meet our current requirements.').trim();

    user.status = USER_STATUSES.ACTIVE;
    user.role = USER_ROLES.READER;
    user.publisherProfile.reviewStatus = 'rejected';
    user.publisherProfile.rejectionReason = finalReason;

    await user.save();

    await logAction({
      actor: adminId,
      action: 'publisher_rejected',
      targetType: 'user',
      targetId: user._id,
      meta: {
        reason: finalReason,
        company: user.publisherProfile.company,
      },
    });

    await createNotification({
      recipientId: user._id,
      type: 'publisher_rejected',
      title: 'Publisher Application Update',
      message: `Your publisher application was not approved. Reason: ${finalReason}`,
      data: {
        role: 'reader',
        reviewStatus: 'rejected',
        reason: finalReason,
      },
    });

    return UserDto.toResponse(user);
  }

  throw new BadRequestError('Invalid action. Must be "approve" or "reject".');
};

/**
 * C2. Get Users with search, filter, pagination, booksCount and reportsCount.
 */
export const getUsers = async ({
  search = '',
  role = 'all',
  status = 'all',
  page = 1,
  limit = 20,
  sort = 'createdAt',
  order = 'desc',
} = {}) => {
  const query = {};

  if (role && role !== 'all') {
    query.role = role;
  }
  if (status && status !== 'all') {
    query.status = status;
  }
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { email: regex }, { username: regex }];
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;
  const sortDirection = order === 'asc' ? 1 : -1;

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ [sort === 'name' ? 'name' : 'createdAt']: sortDirection })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    User.countDocuments(query),
  ]);

  // Aggregate books count and reports count for each returned user
  const userIds = users.map((u) => u._id);

  const [bookCounts, reportCounts] = await Promise.all([
    Book.aggregate([
      { $match: { writerId: { $in: userIds } } },
      { $group: { _id: '$writerId', count: { $sum: 1 } } },
    ]),
    Report.aggregate([
      { $match: { targetType: 'user', targetId: { $in: userIds } } },
      { $group: { _id: '$targetId', count: { $sum: 1 } } },
    ]),
  ]);

  const bookCountMap = new Map(bookCounts.map((b) => [b._id.toString(), b.count]));
  const reportCountMap = new Map(reportCounts.map((r) => [r._id.toString(), r.count]));

  const enrichedUsers = users.map((u) => {
    const dto = UserDto.toResponse(u);
    return {
      ...dto,
      booksCount: bookCountMap.get(u._id.toString()) || 0,
      reportsCount: reportCountMap.get(u._id.toString()) || 0,
      suspensionEndsAt: u.suspensionEndsAt || null,
      lastActiveAt: u.lastActiveAt || u.updatedAt,
    };
  });

  return {
    results: enrichedUsers,
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit) || 1,
    },
  };
};

/**
 * C2. Update User (role change, ban/unban, suspend with automatic book hiding).
 */
export const updateUser = async (userId, { role, status, suspensionDays, suspensionEndsAt, note, adminUser }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found.');
  }

  const adminId = adminUser?.id || adminUser?._id || 'admin';
  const previousRole = user.role;
  const previousStatus = user.status;

  if (role && USER_ROLES[role.toUpperCase()]) {
    user.role = role;
  }

  if (status) {
    user.status = status;

    if (status === USER_STATUSES.SUSPENDED) {
      if (suspensionDays) {
        user.suspensionEndsAt = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);
      } else if (suspensionEndsAt) {
        user.suspensionEndsAt = new Date(suspensionEndsAt);
      }

      // Immediately hide all their published books
      await Book.updateMany(
        { writerId: user._id, status: BOOK_STATUSES.PUBLISHED },
        { status: BOOK_STATUSES.SUSPENDED }
      );
    } else if (status === USER_STATUSES.BANNED) {
      user.suspensionEndsAt = null;
      // Immediately hide all their books
      await Book.updateMany(
        { writerId: user._id },
        { status: BOOK_STATUSES.REMOVED }
      );
    } else if (status === USER_STATUSES.ACTIVE) {
      user.suspensionEndsAt = null;
    }
  }

  await user.save();

  // Audit log
  await logAction({
    actor: adminId,
    action: 'admin_user_updated',
    targetType: 'user',
    targetId: user._id,
    meta: {
      previousRole,
      newRole: user.role,
      previousStatus,
      newStatus: user.status,
      suspensionEndsAt: user.suspensionEndsAt,
      note,
    },
  });

  // In-app notification
  if (user.status !== previousStatus) {
    await createNotification({
      recipientId: user._id,
      type: user.status === USER_STATUSES.ACTIVE ? 'account_restored' : 'account_suspended',
      title: `Account Status Update: ${user.status.toUpperCase()}`,
      message: note || `Your account status has been changed to ${user.status} by an administrator.`,
      data: { status: user.status, suspensionEndsAt: user.suspensionEndsAt },
    });
  }

  return UserDto.toResponse(user);
};

/**
 * C2. Get Books for Admin oversight with search, genre, status filter, and pagination.
 */
export const getBooks = async ({
  search = '',
  genre = '',
  status = 'all',
  page = 1,
  limit = 20,
  sort = 'createdAt',
  order = 'desc',
} = {}) => {
  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }
  if (genre && genre !== 'all') {
    query.genre = genre;
  }
  if (search && search.trim()) {
    query.title = new RegExp(search.trim(), 'i');
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;
  const sortDirection = order === 'asc' ? 1 : -1;

  let sortCriteria = { createdAt: -1 };
  if (sort === 'reads') sortCriteria = { 'stats.reads': sortDirection };
  else if (sort === 'rating') sortCriteria = { 'stats.ratingAvg': sortDirection };
  else if (sort === 'title') sortCriteria = { title: sortDirection };

  const [books, total] = await Promise.all([
    Book.find(query)
      .sort(sortCriteria)
      .skip(skip)
      .limit(numericLimit)
      .populate('writerId', 'name username email')
      .lean(),
    Book.countDocuments(query),
  ]);

  // Get report counts for these books
  const bookIds = books.map((b) => b._id);
  const reportCounts = await Report.aggregate([
    { $match: { targetType: 'book', targetId: { $in: bookIds } } },
    { $group: { _id: '$targetId', count: { $sum: 1 } } },
  ]);
  const reportMap = new Map(reportCounts.map((r) => [r._id.toString(), r.count]));

  const enrichedBooks = books.map((b) => ({
    ...b,
    reportsCount: reportMap.get(b._id.toString()) || 0,
  }));

  return {
    results: enrichedBooks,
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit) || 1,
    },
  };
};

/**
 * C2. Update Book moderation action (unpublish, suspend, restore, takedown).
 */
export const updateBook = async (bookId, { action, reason, adminUser }) => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  const adminId = adminUser?.id || adminUser?._id || 'admin';
  const previousStatus = book.status;

  if (action === 'unpublish') {
    book.status = BOOK_STATUSES.UNPUBLISHED;
  } else if (action === 'suspend' || action === 'takedown') {
    book.status = BOOK_STATUSES.SUSPENDED;
  } else if (action === 'restore') {
    book.status = BOOK_STATUSES.PUBLISHED;
  }

  await book.save();
  await invalidateCatalogueCache();

  // Audit log
  await logAction({
    actor: adminId,
    action: `book_${action}`,
    targetType: 'book',
    targetId: book._id,
    meta: {
      title: book.title,
      previousStatus,
      newStatus: book.status,
      reason,
    },
  });

  // Notify writer
  await createNotification({
    recipientId: book.writerId,
    type: action === 'restore' ? 'book_restored' : 'book_removed',
    title: `Book Moderation: ${book.title}`,
    message: `Your manuscript "${book.title}" was ${action}ed by administration. Reason: ${reason}`,
    data: { bookId: book._id, status: book.status, action },
  });

  return book;
};

export default {
  getAdminStats,
  getPublishers,
  reviewPublisher,
  getUsers,
  updateUser,
  getBooks,
  updateBook,
};
