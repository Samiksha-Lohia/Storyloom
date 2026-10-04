import Book from '../models/book.model.js';
import Document from '../models/document.model.js';
import { ForbiddenError } from '../utilities/custom-errors.js';

/**
 * Mature Content Gate Middleware
 * Ensures users acknowledge mature 18+ content before accessing pages or analysis.
 * Authors and Administrators are strictly exempt.
 */
export async function requireMatureAck(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return next();
    }

    // Admins are exempt
    if (user.role === 'admin') {
      return next();
    }

    // Resolve target book if not already attached to req
    let book = req.book;
    if (!book) {
      const bookId = req.params.bookId || req.query.bookId;
      if (bookId) {
        book = await Book.findById(bookId);
      } else if (req.params.documentId) {
        book = await Book.findOne({ documentId: req.params.documentId });
      }
    }

    // If no book or book is not mature, proceed
    if (!book || !book.mature) {
      return next();
    }

    // Authors/owners are exempt
    const isOwner =
      (book.writerId && book.writerId.toString() === user.id.toString()) ||
      (req.document?.userId && req.document.userId.toString() === user.id.toString());

    if (isOwner) {
      return next();
    }

    // Check user acknowledgement from database
    const User = (await import('../models/user.model.js')).default;
    const dbUser = await User.findById(user.id).select('matureAckAt');
    if (!dbUser || !dbUser.matureAckAt) {
      throw new ForbiddenError(
        'This content contains 18+ mature themes and requires acknowledgement.',
        'MATURE_ACK_REQUIRED'
      );
    }

    req.user.matureAckAt = dbUser.matureAckAt;
    next();
  } catch (err) {
    next(err);
  }
}

