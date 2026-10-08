import mongoose from 'mongoose';
import Book from '../models/book.model.js';
import User from '../models/user.model.js';
import Review from '../models/review.model.js';
import ReadingList from '../models/reading-list.model.js';
import DailyStat from '../models/daily-stat.model.js';
import ViewEvent from '../models/view-event.model.js';
import Wishlist from '../models/wishlist.model.js';
import PublishRequest from '../models/publish-request.model.js';
import Follow from '../models/follow.model.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utilities/custom-errors.js';
import { USER_ROLES } from '../constants/user-roles.js';

export const buildDropOffPipeline = (targetBookIds) => {
  return [
    {
      $match: {
        bookId: { $in: targetBookIds },
      },
    },
    {
      $lookup: {
        from: 'books',
        localField: 'bookId',
        foreignField: '_id',
        as: 'book',
      },
    },
    { $unwind: '$book' },
    {
      $lookup: {
        from: 'documents',
        localField: 'book.documentId',
        foreignField: '_id',
        as: 'doc',
      },
    },
    {
      $unwind: {
        path: '$doc',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        bookId: 1,
        furthestOffset: { $ifNull: ['$furthestOffset', 0] },
        totalLength: {
          $cond: {
            if: { $gt: [{ $strLenCP: { $ifNull: ['$doc.parsedText', ''] } }, 0] },
            then: { $strLenCP: { $ifNull: ['$doc.parsedText', ''] } },
            else: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ['$book.pageOffsets', []] } }, 0] },
                then: { $add: [{ $arrayElemAt: ['$book.pageOffsets', -1] }, 1800] },
                else: 1000,
              },
            },
          },
        },
      },
    },
    {
      $project: {
        percent: {
          $min: [
            100,
            {
              $max: [
                0,
                {
                  $multiply: [
                    {
                      $cond: [
                        { $gt: ['$totalLength', 0] },
                        { $divide: ['$furthestOffset', '$totalLength'] },
                        0,
                      ],
                    },
                    100,
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $bucket: {
        groupBy: '$percent',
        boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
        default: 'Other',
        output: {
          count: { $sum: 1 },
        },
      },
    },
  ];
};

export const explainDropOffAggregation = async ({ writerId, bookId }) => {
  let targetBookIds = [];
  if (bookId) {
    targetBookIds = [new mongoose.Types.ObjectId(bookId)];
  } else {
    const books = await Book.find({ writerId }).select('_id').lean();
    targetBookIds = books.map((b) => b._id);
  }

  const pipeline = buildDropOffPipeline(targetBookIds);
  const explainResult = await ReadingList.aggregate(pipeline).explain('executionStats');
  return explainResult;
};

export const getWriterAnalytics = async ({ writerId, range = 30, bookId = null, userRole = null }) => {
  const rangeDays = range === 90 ? 90 : 30;

  const writerBooks = await Book.find({ writerId }).lean();
  let filteredBooks = writerBooks;

  if (bookId) {
    const found = writerBooks.find((b) => b._id.toString() === bookId.toString());
    if (!found) {
      if (userRole === USER_ROLES.ADMIN) {
        const adminBook = await Book.findById(bookId).lean();
        if (!adminBook) throw new NotFoundError('Book not found.');
        filteredBooks = [adminBook];
      } else {
        throw new ForbiddenError('You do not have access to this book.');
      }
    } else {
      filteredBooks = [found];
    }
  }

  const targetBookIds = filteredBooks.map((b) => b._id);

  const today = new Date();
  const dateList = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    dateList.push(d.toISOString().slice(0, 10));
  }
  const startDateStr = dateList[0];
  const endDateStr = dateList[dateList.length - 1];

  const statsQuery = {
    date: { $gte: startDateStr, $lte: endDateStr },
  };

  if (bookId) {
    statsQuery.scope = 'book';
    statsQuery.targetId = new mongoose.Types.ObjectId(bookId);
  } else {
    statsQuery.scope = 'book';
    statsQuery.targetId = { $in: targetBookIds };
  }

  const dailyStats = await DailyStat.find(statsQuery).lean();
  const statsByDate = new Map();
  for (const s of dailyStats) {
    const existing = statsByDate.get(s.date) || { reads: 0, views: 0 };
    existing.reads += s.reads || 0;
    existing.views += s.views || 0;
    statsByDate.set(s.date, existing);
  }

  const readsOverTime = dateList.map((d) => {
    const stat = statsByDate.get(d) || { reads: 0, views: 0 };
    return {
      date: d,
      reads: stat.reads,
      views: stat.views,
    };
  });

  let dropOff = [
    { bucket: '0-10%', count: 0, percentage: 0 },
    { bucket: '10-20%', count: 0, percentage: 0 },
    { bucket: '20-30%', count: 0, percentage: 0 },
    { bucket: '30-40%', count: 0, percentage: 0 },
    { bucket: '40-50%', count: 0, percentage: 0 },
    { bucket: '50-60%', count: 0, percentage: 0 },
    { bucket: '60-70%', count: 0, percentage: 0 },
    { bucket: '70-80%', count: 0, percentage: 0 },
    { bucket: '80-90%', count: 0, percentage: 0 },
    { bucket: '90-100%', count: 0, percentage: 0 },
  ];

  if (targetBookIds.length > 0) {
    const pipeline = buildDropOffPipeline(targetBookIds);
    const bucketResults = await ReadingList.aggregate(pipeline);

    const boundaryMap = {
      0: 0,
      10: 1,
      20: 2,
      30: 3,
      40: 4,
      50: 5,
      60: 6,
      70: 7,
      80: 8,
      90: 9,
    };

    let totalDropOffCount = 0;
    for (const b of bucketResults) {
      const idx = boundaryMap[b._id];
      if (idx !== undefined && dropOff[idx]) {
        dropOff[idx].count = b.count;
        totalDropOffCount += b.count;
      }
    }

    if (totalDropOffCount > 0) {
      dropOff = dropOff.map((item) => ({
        ...item,
        percentage: Math.round((item.count / totalDropOffCount) * 100),
      }));
    }
  }

  const perBookComparison = filteredBooks.map((b) => ({
    id: b._id,
    title: b.title,
    coverUrl: b.coverUrl,
    status: b.status,
    reads: b.stats?.reads || 0,
    ratingAvg: b.stats?.ratingAvg || 0,
    ratingCount: b.stats?.ratingCount || 0,
    completionRate: b.stats?.completionRate || 0,
    readingListAdds: b.stats?.readingListAdds || 0,
  }));

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (targetBookIds.length > 0) {
    const reviewAgg = await Review.aggregate([
      {
        $match: {
          bookId: { $in: targetBookIds },
          status: 'visible',
        },
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    for (const r of reviewAgg) {
      if (ratingDistribution[r._id] !== undefined) {
        ratingDistribution[r._id] = r.count;
      }
    }
  }

  let latestReviews = [];
  if (targetBookIds.length > 0) {
    latestReviews = await Review.find({
      bookId: { $in: targetBookIds },
      status: 'visible',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('readerId', 'name username avatarUrl')
      .populate('bookId', 'title')
      .lean();
  }

  const totalReads = filteredBooks.reduce((sum, b) => sum + (b.stats?.reads || 0), 0);
  const totalRatingCount = filteredBooks.reduce((sum, b) => sum + (b.stats?.ratingCount || 0), 0);
  const totalRatingSum = filteredBooks.reduce(
    (sum, b) => sum + (b.stats?.ratingAvg || 0) * (b.stats?.ratingCount || 0),
    0
  );
  const avgRating = totalRatingCount > 0 ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10 : 0;

  const totalReadingListAdds = filteredBooks.reduce(
    (sum, b) => sum + (b.stats?.readingListAdds || 0),
    0
  );

  const rangeStartDate = new Date(`${startDateStr}T00:00:00.000Z`);
  const rangeEndDate = new Date(`${endDateStr}T23:59:59.999Z`);
  const newReviewsCount = await Review.countDocuments({
    bookId: { $in: targetBookIds },
    status: 'visible',
    createdAt: { $gte: rangeStartDate, $lte: rangeEndDate },
  });

  const profileViewsCount = await ViewEvent.countDocuments({
    type: 'profile_view',
    targetId: writerId,
  });

  const publisherWishlistsCount = await Wishlist.countDocuments({
    bookId: { $in: targetBookIds },
  });

  const openRequestsCount = await PublishRequest.countDocuments({
    bookId: { $in: targetBookIds },
    status: { $in: ['pending', 'accepted'] },
  });

  return {
    kpis: {
      totalReads,
      profileViews: profileViewsCount,
      avgRating,
      newReviews: newReviewsCount,
      readingListAdds: totalReadingListAdds,
      publisherWishlists: publisherWishlistsCount,
      openRequests: openRequestsCount,
    },
    readsOverTime,
    dropOff,
    perBookComparison,
    ratingDistribution,
    latestReviews,
  };
};

export const getWriterReviews = async ({
  writerId,
  bookId = null,
  rating = null,
  unreadOnly = false,
  page = 1,
  limit = 20,
}) => {
  const writerBooks = await Book.find({ writerId }).select('_id title').lean();
  const writerBookIds = writerBooks.map((b) => b._id);

  const query = {
    bookId: { $in: writerBookIds },
    status: 'visible',
  };

  if (bookId) {
    const isOwned = writerBookIds.some((id) => id.toString() === bookId.toString());
    if (!isOwned) throw new ForbiddenError('You do not own this book.');
    query.bookId = new mongoose.Types.ObjectId(bookId);
  }

  if (rating) {
    query.rating = Number(rating);
  }

  if (unreadOnly) {
    query.readByWriter = false;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [reviews, total, unreadCount] = await Promise.all([
    Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .populate('readerId', 'name username avatarUrl')
      .populate('bookId', 'title coverUrl')
      .lean(),
    Review.countDocuments(query),
    Review.countDocuments({ bookId: { $in: writerBookIds }, status: 'visible', readByWriter: false }),
  ]);

  return {
    reviews,
    unreadCount,
    books: writerBooks,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit),
    },
  };
};

export const getWriterProfile = async (identifier, currentUserId = null) => {
  let writer = null;
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier) && identifier.length === 24;

  if (isObjectId) {
    writer = await User.findById(identifier)
      .select('name username avatarUrl bio role defaultTemplate defaultAccent createdAt')
      .lean();
  }

  if (!writer) {
    writer = await User.findOne({ username: identifier.toLowerCase().trim() })
      .select('name username avatarUrl bio role defaultTemplate defaultAccent createdAt')
      .lean();
  }

  if (!writer) {
    throw new NotFoundError('Writer not found.');
  }

  const [publishedBooks, followerCount, isFollowing] = await Promise.all([
    Book.find({
      writerId: writer._id,
      status: 'published',
    })
      .select('_id title coverUrl genre tags stats pageCount blurb template accent')
      .sort({ createdAt: -1 })
      .lean(),
    Follow.countDocuments({ writerId: writer._id }),
    currentUserId
      ? Follow.exists({ followerId: currentUserId, writerId: writer._id })
      : false,
  ]);

  return {
    writer: {
      id: writer._id,
      name: writer.name,
      username: writer.username,
      avatarUrl: writer.avatarUrl,
      bio: writer.bio,
      defaultTemplate: writer.defaultTemplate || 'classic',
      defaultAccent: writer.defaultAccent || '#FF500A',
      createdAt: writer.createdAt,
    },
    books: publishedBooks,
    publishedBooks,
    followerCount,
    isFollowing: !!isFollowing,
  };
};

export const followWriter = async (followerId, username) => {
  const writer = await User.findOne({ username: username.toLowerCase().trim() });
  if (!writer) {
    throw new NotFoundError('Writer not found.');
  }

  if (writer._id.toString() === followerId.toString()) {
    throw new BadRequestError('You cannot follow yourself.');
  }

  await Follow.findOneAndUpdate(
    { followerId, writerId: writer._id },
    { followerId, writerId: writer._id },
    { upsert: true, new: true }
  );

  const followerCount = await Follow.countDocuments({ writerId: writer._id });
  return {
    following: true,
    followerCount,
    writerId: writer._id,
    username: writer.username,
  };
};

export const unfollowWriter = async (followerId, username) => {
  const writer = await User.findOne({ username: username.toLowerCase().trim() });
  if (!writer) {
    throw new NotFoundError('Writer not found.');
  }

  await Follow.findOneAndDelete({ followerId, writerId: writer._id });

  const followerCount = await Follow.countDocuments({ writerId: writer._id });
  return {
    following: false,
    followerCount,
    writerId: writer._id,
    username: writer.username,
  };
};

export default {
  getWriterAnalytics,
  explainDropOffAggregation,
  getWriterReviews,
  getWriterProfile,
  followWriter,
  unfollowWriter,
  buildDropOffPipeline,
};

