import Wishlist from '../models/wishlist.model.js';
import Book from '../models/book.model.js';
import { NotFoundError, BadRequestError } from '../utilities/custom-errors.js';

export const addToWishlist = async (publisherId, bookId, notes = '') => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  const existing = await Wishlist.findOne({ publisherId, bookId });
  if (existing) {
    if (notes !== undefined && notes !== null) {
      existing.notes = notes;
      await existing.save();
    }
    return existing;
  }

  const item = await Wishlist.create({
    publisherId,
    bookId,
    notes: notes || '',
  });

  return item;
};

export const removeFromWishlist = async (publisherId, bookId) => {
  const result = await Wishlist.findOneAndDelete({ publisherId, bookId });
  return !!result;
};

export const isWishlisted = async (publisherId, bookId) => {
  if (!publisherId || !bookId) return false;
  const count = await Wishlist.countDocuments({ publisherId, bookId });
  return count > 0;
};

export const getPublisherWishlist = async (publisherId, { page = 1, limit = 20 } = {}) => {
  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [items, total] = await Promise.all([
    Wishlist.find({ publisherId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .populate({
        path: 'bookId',
        select: 'title coverUrl genre blurb tags pageCount mature status stats template accent writerId',
        populate: {
          path: 'writerId',
          select: 'name username avatarUrl',
        },
      })
      .lean(),
    Wishlist.countDocuments({ publisherId }),
  ]);

  const validItems = items.filter((item) => item.bookId);

  return {
    results: validItems,
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit) || 1,
    },
  };
};

export const getWishlistCount = async (bookId) => {
  if (!bookId) return 0;
  return Wishlist.countDocuments({ bookId });
};

export default {
  addToWishlist,
  removeFromWishlist,
  isWishlisted,
  getPublisherWishlist,
  getWishlistCount,
};
