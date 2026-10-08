import Book from '../models/book.model.js';
import documentRepository from '../repositories/document.repository.js';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '../utilities/custom-errors.js';
import { BOOK_STATUSES } from '../constants/book.js';
import { USER_ROLES } from '../constants/user-roles.js';

export const resolveBook = async (req, _res, next) => {
  try {
    const { bookId } = req.params;
    if (!bookId) {
      return next(new NotFoundError('Book not found.'));
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return next(new NotFoundError('Book not found.'));
    }

    if (book.status !== BOOK_STATUSES.PUBLISHED) {
      const isOwner = req.user && book.writerId.toString() === req.user.id.toString();
      const isAdmin = req.user && req.user.role === USER_ROLES.ADMIN;

      if (!isOwner && !isAdmin) {
        return next(new NotFoundError('Book not found.'));
      }
    }

    req.book = book;

    if (book.documentId) {
      const document = await documentRepository.findById(book.documentId);
      if (document) {
        req.document = document;
        req.params.documentId = book.documentId.toString();
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const requireBookOwnerOrAdmin = (req, _res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required.'));
  }

  if (!req.book) {
    return next(new NotFoundError('Book not found.'));
  }

  const isOwner = req.book.writerId.toString() === req.user.id.toString();
  const isAdmin = req.user.role === USER_ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    return next(new ForbiddenError('You do not have permission to modify this book.'));
  }

  next();
};

export default {
  resolveBook,
  requireBookOwnerOrAdmin,
};
