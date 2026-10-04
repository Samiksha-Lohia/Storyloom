import * as wishlistService from '../services/wishlist.service.js';
import { sendSuccess, sendPaginated } from '../utilities/response.js';

export const getWishlist = async (req, res, next) => {
  try {
    const { results, pagination } = await wishlistService.getPublisherWishlist(
      req.user.id,
      req.query
    );
    sendPaginated(res, results, pagination, 'Wishlist retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const getWishlistBook = async (req, res, next) => {
  try {
    const wishlisted = await wishlistService.isWishlisted(
      req.user.id,
      req.params.bookId
    );
    sendSuccess(res, { wishlisted, isWishlisted: wishlisted, bookId: req.params.bookId }, 200, 'Wishlist status retrieved.');
  } catch (err) {
    next(err);
  }
};

export const addToWishlist = async (req, res, next) => {
  try {
    const item = await wishlistService.addToWishlist(
      req.user.id,
      req.params.bookId,
      req.body?.notes
    );
    sendSuccess(res, { wishlisted: true, item }, 200, 'Book added to wishlist.');
  } catch (err) {
    next(err);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    await wishlistService.removeFromWishlist(req.user.id, req.params.bookId);
    sendSuccess(res, { wishlisted: false, bookId: req.params.bookId }, 200, 'Book removed from wishlist.');
  } catch (err) {
    next(err);
  }
};

export default {
  getWishlist,
  getWishlistBook,
  addToWishlist,
  removeFromWishlist,
};
