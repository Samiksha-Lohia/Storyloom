import mongoose from 'mongoose';
import Book from '../models/book.model.js';
import Document from '../models/document.model.js';
import Review from '../models/review.model.js';
import ReadingList from '../models/reading-list.model.js';
import ViewEvent from '../models/view-event.model.js';
import DailyStat from '../models/daily-stat.model.js';
import User from '../models/user.model.js';
import logger from '../utilities/logger.js';

export const getDateBoundaries = (dateStr) => {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
};

export const getBookTextLength = (book, doc) => {
  if (doc?.parsedText?.length) return doc.parsedText.length;
  if (book.pageOffsets && book.pageOffsets.length > 0) {
    const lastOffset = book.pageOffsets[book.pageOffsets.length - 1];
    return lastOffset + 1800;
  }
  return 1000;
};

export const rollupStatsForDate = async (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format for rollup: "${dateStr}". Expected YYYY-MM-DD.`);
  }

  const { start, end } = getDateBoundaries(dateStr);
  logger.info(`[StatsRollup] Starting rollup for date: ${dateStr} (${start.toISOString()} - ${end.toISOString()})`);

  const books = await Book.find({}).lean();
  const docIds = books.map((b) => b.documentId).filter(Boolean);
  const docs = await Document.find({ _id: { $in: docIds } })
    .select('_id parsedText wordCount')
    .lean();
  const docMap = new Map(docs.map((d) => [d._id.toString(), d]));

  const writerBooksMap = new Map();

  let platformViews = 0;
  let platformReads = 0;
  let platformReviews = 0;
  let platformAdds = 0;
  let platformCompletions = 0;

  for (const book of books) {
    const bookId = book._id;
    const writerId = (book.writerId?._id || book.writerId)?.toString();

    if (writerId) {
      if (!writerBooksMap.has(writerId)) {
        writerBooksMap.set(writerId, []);
      }
      writerBooksMap.get(writerId).push(bookId);
    }

    const doc = docMap.get(book.documentId?.toString());
    const totalLength = getBookTextLength(book, doc);
    const completionThreshold = Math.floor(totalLength * 0.9);

    const views = await ViewEvent.countDocuments({
      type: 'book_view',
      targetId: bookId,
      day: dateStr,
    });

    const reads = await ReadingList.countDocuments({
      bookId,
      createdAt: { $gte: start, $lte: end },
    });

    const readingListAdds = await ReadingList.countDocuments({
      bookId,
      createdAt: { $gte: start, $lte: end },
    });

    const reviews = await Review.countDocuments({
      bookId,
      status: 'visible',
      createdAt: { $gte: start, $lte: end },
    });

    const completions = await ReadingList.countDocuments({
      bookId,
      updatedAt: { $gte: start, $lte: end },
      $or: [
        { status: 'finished' },
        { furthestOffset: { $gte: completionThreshold } },
      ],
    });

    await DailyStat.findOneAndUpdate(
      { date: dateStr, scope: 'book', targetId: bookId },
      {
        $set: {
          views,
          reads,
          reviews,
          readingListAdds,
          completions,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    platformViews += views;
    platformReads += reads;
    platformReviews += reviews;
    platformAdds += readingListAdds;
    platformCompletions += completions;
  }

  const writers = await User.find({ role: { $in: ['writer', 'admin'] } })
    .select('_id')
    .lean();

  for (const writer of writers) {
    const writerId = writer._id;
    const writerBookIds = writerBooksMap.get(writerId.toString()) || [];

    const profileViews = await ViewEvent.countDocuments({
      type: 'profile_view',
      targetId: writerId,
      day: dateStr,
    });

    let writerReads = 0;
    let writerReviews = 0;
    let writerAdds = 0;
    let writerCompletions = 0;

    if (writerBookIds.length > 0) {
      const bookDailyStats = await DailyStat.find({
        date: dateStr,
        scope: 'book',
        targetId: { $in: writerBookIds },
      }).lean();

      for (const bs of bookDailyStats) {
        writerReads += bs.reads || 0;
        writerReviews += bs.reviews || 0;
        writerAdds += bs.readingListAdds || 0;
        writerCompletions += bs.completions || 0;
      }
    }

    await DailyStat.findOneAndUpdate(
      { date: dateStr, scope: 'writer', targetId: writerId },
      {
        $set: {
          views: profileViews,
          reads: writerReads,
          reviews: writerReviews,
          readingListAdds: writerAdds,
          completions: writerCompletions,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const activeUsersCount = await ViewEvent.countDocuments({
    type: 'active',
    day: dateStr,
  });

  const platformStat = await DailyStat.findOneAndUpdate(
    { date: dateStr, scope: 'platform', targetId: null },
    {
      $set: {
        views: platformViews + activeUsersCount,
        reads: platformReads,
        reviews: platformReviews,
        readingListAdds: platformAdds,
        completions: platformCompletions,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await refreshAllBookStats();

  logger.info(
    `[StatsRollup] Completed rollup for date: ${dateStr}. Books: ${books.length}, Writers: ${writers.length}`
  );

  return {
    booksProcessed: books.length,
    writersProcessed: writers.length,
    platformStat,
  };
};

export const refreshAllBookStats = async () => {
  const books = await Book.find({}).lean();
  const docIds = books.map((b) => b.documentId).filter(Boolean);
  const docs = await Document.find({ _id: { $in: docIds } })
    .select('_id parsedText')
    .lean();
  const docMap = new Map(docs.map((d) => [d._id.toString(), d]));

  for (const book of books) {
    const bookId = book._id;
    const doc = docMap.get(book.documentId?.toString());
    const totalLength = getBookTextLength(book, doc);
    const completionThreshold = Math.floor(totalLength * 0.9);

    const [reads, readingListAdds, completions, reviewStats] = await Promise.all([
      ReadingList.countDocuments({ bookId }),
      ReadingList.countDocuments({ bookId }),
      ReadingList.countDocuments({
        bookId,
        $or: [
          { status: 'finished' },
          { furthestOffset: { $gte: completionThreshold } },
        ],
      }),
      Review.aggregate([
        { $match: { bookId: new mongoose.Types.ObjectId(bookId), status: 'visible' } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
    ]);

    const ratingCount = reviewStats[0]?.count || 0;
    const ratingAvg = ratingCount > 0 ? Math.round(reviewStats[0].avgRating * 10) / 10 : 0;
    const completionRate = reads > 0 ? Math.round((completions / reads) * 100) : 0;

    await Book.updateOne(
      { _id: bookId },
      {
        $set: {
          'stats.reads': reads,
          'stats.readingListAdds': readingListAdds,
          'stats.completionRate': completionRate,
          'stats.ratingAvg': ratingAvg,
          'stats.ratingCount': ratingCount,
        },
      }
    );
  }
};

export const rollupDateRange = async (startDateStr, endDateStr) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    throw new Error(`Invalid date range: ${startDateStr} to ${endDateStr}`);
  }

  const curr = new Date(start);
  const results = [];

  while (curr <= end) {
    const dStr = curr.toISOString().slice(0, 10);
    const res = await rollupStatsForDate(dStr);
    results.push({ date: dStr, ...res });
    curr.setDate(curr.getDate() + 1);
  }

  return results;
};

export default {
  rollupStatsForDate,
  rollupDateRange,
  refreshAllBookStats,
  getDateBoundaries,
  getBookTextLength,
};
