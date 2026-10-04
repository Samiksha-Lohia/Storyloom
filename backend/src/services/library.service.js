import ReadingList from '../models/reading-list.model.js';
import Book from '../models/book.model.js';
import { pageForOffset } from './paginator.service.js';
import { NotFoundError, BadRequestError } from '../utilities/custom-errors.js';

export class LibraryService {
  /**
   * Retrieves all books in a reader's library with reading status and calculated pages.
   */
  static async getLibrary(readerId, { page = 1, limit = 20, status } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { readerId };
    if (status) {
      filter.status = status;
    }

    const [entries, total] = await Promise.all([
      ReadingList.find(filter)
        .populate({
          path: 'bookId',
          select: 'title coverUrl coverPublicId genre blurb tags pageCount mature status stats writerId',
          populate: { path: 'writerId', select: 'name username' },
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ReadingList.countDocuments(filter),
    ]);

    const formatted = entries.map((entry) => {
      const book = entry.bookId;
      const pageOffsets = book?.pageOffsets || [];
      return {
        id: entry._id.toString(),
        book: book
          ? {
              id: book._id.toString(),
              title: book.title,
              coverUrl: book.coverUrl,
              coverPublicId: book.coverPublicId,
              genre: book.genre,
              blurb: book.blurb,
              pageCount: book.pageCount,
              mature: book.mature,
              status: book.status,
              stats: book.stats,
              writer: book.writerId ? { name: book.writerId.name, username: book.writerId.username } : null,
            }
          : null,
        status: entry.status,
        currentOffset: entry.currentOffset,
        currentPage: pageForOffset(pageOffsets, entry.currentOffset),
        furthestOffset: entry.furthestOffset,
        furthestPage: pageForOffset(pageOffsets, entry.furthestOffset),
        bookmarksCount: entry.bookmarks?.length || 0,
        updatedAt: entry.updatedAt,
      };
    });

    return {
      items: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Retrieves a single book's library entry for a reader.
   */
  static async getLibraryEntry(readerId, bookId) {
    const entry = await ReadingList.findOne({ readerId, bookId })
      .populate('bookId', 'title pageCount pageOffsets mature status stats')
      .lean();

    if (!entry) {
      return null;
    }

    const book = entry.bookId;
    const pageOffsets = book?.pageOffsets || [];

    return {
      id: entry._id.toString(),
      bookId: (book?._id || bookId).toString(),
      status: entry.status,
      currentOffset: entry.currentOffset,
      currentPage: pageForOffset(pageOffsets, entry.currentOffset),
      furthestOffset: entry.furthestOffset,
      furthestPage: pageForOffset(pageOffsets, entry.furthestOffset),
      bookmarks: (entry.bookmarks || []).map((b) => ({
        offset: b.offset,
        page: pageForOffset(pageOffsets, b.offset),
        createdAt: b.createdAt,
      })),
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Removes a book from a reader's library.
   */
  static async deleteLibraryEntry(readerId, bookId) {
    const res = await ReadingList.findOneAndDelete({ readerId, bookId });
    if (!res) {
      throw new NotFoundError('Book is not in your library.');
    }
    return true;
  }

  /**
   * Updates or creates a reader's reading progress and bookmarks for a book.
   */
  static async updateLibraryEntry(readerId, bookId, data = {}) {
    const book = await Book.findById(bookId);
    if (!book) {
      throw new NotFoundError('Book not found.');
    }

    let entry = await ReadingList.findOne({ readerId, bookId });
    let isNew = false;

    if (!entry) {
      isNew = true;
      entry = new ReadingList({
        readerId,
        bookId,
        status: data.status || 'reading',
        currentOffset: 0,
        furthestOffset: 0,
        bookmarks: [],
      });

      // Task 9: Increment stats.reads the first time a reader progress entry is created
      book.stats.reads = (book.stats?.reads || 0) + 1;
      await book.save();
    }

    const pageOffsets = book.pageOffsets || [];

    // Calculate new offset from currentPage or currentOffset
    let newOffset = null;
    if (typeof data.currentPage === 'number') {
      const pageIndex = Math.max(1, Math.min(data.currentPage, book.pageCount || 1)) - 1;
      newOffset = pageOffsets[pageIndex] !== undefined ? pageOffsets[pageIndex] : 0;
    } else if (typeof data.currentOffset === 'number') {
      newOffset = Math.max(0, data.currentOffset);
    }

    if (newOffset !== null) {
      entry.currentOffset = newOffset;
      // Monotonic progression: furthestOffset can NEVER decrease
      entry.furthestOffset = Math.max(entry.furthestOffset || 0, newOffset);
    }

    // Auto-set status = 'finished' if reached last page
    if (book.pageCount > 0 && pageOffsets.length > 0) {
      const lastPageStart = pageOffsets[book.pageCount - 1] ?? 0;
      if (entry.currentOffset >= lastPageStart || entry.furthestOffset >= lastPageStart) {
        entry.status = 'finished';
      }
    }

    // Explicit status update if provided and not overridden
    if (data.status && entry.status !== 'finished') {
      entry.status = data.status;
    }

    // Bookmark additions
    if (data.addBookmark && typeof data.addBookmark.offset === 'number') {
      const bOffset = Math.max(0, data.addBookmark.offset);
      const exists = entry.bookmarks.some((b) => Math.abs(b.offset - bOffset) < 5);
      if (!exists) {
        entry.bookmarks.push({ offset: bOffset, createdAt: new Date() });
      }
    }

    // Bookmark removals
    if (data.removeBookmark && typeof data.removeBookmark.offset === 'number') {
      const rOffset = data.removeBookmark.offset;
      entry.bookmarks = entry.bookmarks.filter((b) => Math.abs(b.offset - rOffset) >= 5);
    }

    await entry.save();

    return {
      id: entry._id.toString(),
      bookId: book._id.toString(),
      status: entry.status,
      currentOffset: entry.currentOffset,
      currentPage: pageForOffset(pageOffsets, entry.currentOffset),
      furthestOffset: entry.furthestOffset,
      furthestPage: pageForOffset(pageOffsets, entry.furthestOffset),
      bookmarks: entry.bookmarks.map((b) => ({
        offset: b.offset,
        page: pageForOffset(pageOffsets, b.offset),
        createdAt: b.createdAt,
      })),
      updatedAt: entry.updatedAt,
      isNewEntry: isNew,
    };
  }

  /**
   * Helper called during page reads: auto-creates library entry and tracks progression.
   */
  static async recordPageRead(readerId, book, { from, to }) {
    if (!readerId || !book) return;

    try {
      let entry = await ReadingList.findOne({ readerId, bookId: book._id });
      const pageOffsets = book.pageOffsets || [];

      if (!entry) {
        entry = new ReadingList({
          readerId,
          bookId: book._id,
          status: 'reading',
          currentOffset: 0,
          furthestOffset: 0,
          bookmarks: [],
        });

        // First page fetch creates entry -> increment reads
        book.stats.reads = (book.stats?.reads || 0) + 1;
        await book.save();
      }

      const fromIndex = Math.max(1, from) - 1;
      const toIndex = Math.max(1, to) - 1;
      const readOffset = pageOffsets[fromIndex] !== undefined ? pageOffsets[fromIndex] : 0;
      const furthestPageOffset = pageOffsets[toIndex] !== undefined ? pageOffsets[toIndex] : readOffset;

      entry.currentOffset = readOffset;
      entry.furthestOffset = Math.max(entry.furthestOffset || 0, furthestPageOffset);

      if (to >= book.pageCount && book.pageCount > 0) {
        entry.status = 'finished';
      }

      await entry.save();
    } catch (err) {
      // Non-blocking for page delivery
      console.warn('Failed to record page read progress:', err.message);
    }
  }
}
