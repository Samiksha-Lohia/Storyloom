import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { authenticate, authenticateOptional } from '../middleware/auth.middleware.js';
import { authorize, requireActive } from '../middleware/rbac.middleware.js';
import { uploadBook, uploadCover } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { resolveBook, requireBookOwnerOrAdmin } from '../middleware/resolveBook.js';
import { requireMatureAck } from '../middleware/mature-gate.middleware.js';
import {
  createBookSchema,
  updateBookSchema,
  bookIdParamSchema,
  queryCatalogueSchema,
  getPagesQuerySchema,
} from '../validators/book.validator.js';
import * as bookService from '../services/book.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utilities/response.js';
import { ApiError } from '../utilities/custom-errors.js';
import { USER_ROLES } from '../constants/user-roles.js';
import bookAnalysisRoutes from './book-analysis.routes.js';
import reviewRoutes from './review.routes.js';
import * as pitchService from '../services/pitch.service.js';
import { recordBookView } from '../services/event.service.js';

export const PUBLIC_ROUTES = ['GET /', 'GET /:bookId'];




const router = Router();

// Rate limiter for book creation: 20 books per hour per user/IP
const bookCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:book-create:',
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.user?.id || 'anon'}`,
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many book creation attempts. Please try again later.'));
  },
});

/**
 * POST /api/books
 * Roles: writer, admin (must be active)
 * Creates a book and manuscript document; triggers parsing pipeline.
 */
router.post(
  '/',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  bookCreateLimiter,
  uploadBook,
  validate(createBookSchema),
  async (req, res, next) => {
    try {
      const book = await bookService.createBook(req.user.id, req.files, req.body);
      sendCreated(res, book, 'Book created successfully and processing started.');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/books
 * Roles: public
 * Returns published catalogue with search, filter, and pagination.
 */
router.get('/', authenticateOptional, validate(queryCatalogueSchema), async (req, res, next) => {
  try {
    const { results, pagination } = await bookService.getCatalogue(req.query, req.user);
    sendPaginated(res, results, pagination, 'Catalogue retrieved successfully.');
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/books/writer/mine
 * Roles: writer, admin
 * Returns all books for the authenticated writer across all statuses.
 */
router.get(
  '/writer/mine',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const books = await bookService.getWriterBooks(req.user.id);
      sendSuccess(res, books, 200, 'Writer books retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/books/:bookId
 * Roles: public if published; owner/admin otherwise (returns 404 to others).
 */
router.get(
  '/:bookId',
  validate(bookIdParamSchema),
  authenticateOptional,
  async (req, res, next) => {
    try {
      const book = await bookService.getBookById(req.params.bookId, req.user);
      if (book) {
        await recordBookView(book.id || book._id, req);
      }
      sendSuccess(res, book, 200, 'Book retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/books/:bookId/pages
 * Roles: reader, publisher, writer, admin (published only for non-owners)
 * Window capped at 5 pages.
 */
router.get(
  '/:bookId/pages',
  authenticate,
  requireActive,
  authorize(
    USER_ROLES.READER,
    USER_ROLES.PUBLISHER,
    USER_ROLES.WRITER,
    USER_ROLES.ADMIN
  ),
  validate(getPagesQuerySchema),
  requireMatureAck,
  async (req, res, next) => {
    try {
      const result = await bookService.getBookPages(
        req.params.bookId,
        req.user,
        req.query
      );
      sendSuccess(res, result, 200, 'Pages retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/books/:bookId/scene-markers
 * Roles: reader, publisher, writer, admin
 * Returns page numbers where scenes begin for reader scrubber (spoiler-free).
 */
router.get(
  '/:bookId/scene-markers',
  authenticate,
  requireActive,
  authorize(
    USER_ROLES.READER,
    USER_ROLES.PUBLISHER,
    USER_ROLES.WRITER,
    USER_ROLES.ADMIN
  ),
  validate(bookIdParamSchema),
  requireMatureAck,
  async (req, res, next) => {
    try {
      const result = await bookService.getSceneMarkers(
        req.params.bookId,
        req.user
      );
      sendSuccess(res, result, 200, 'Scene markers retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * /api/books/:bookId/analysis
 * Role-gated, spoiler-protected analysis endpoints
 */
router.use('/:bookId/analysis', bookAnalysisRoutes);

/**
 * /api/books/:bookId/reviews
 * Reviews, ratings, and histogram endpoints
 */
router.use('/:bookId/reviews', reviewRoutes);

/**
 * POST /api/books/:bookId/accept-terms
 * Writers / Admins re-accept terms for an existing book
 */
router.post(
  '/:bookId/accept-terms',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  validate(bookIdParamSchema),
  async (req, res, next) => {
    try {
      const updatedBook = await bookService.acceptTerms(req.params.bookId, req.user);
      sendSuccess(res, updatedBook, 200, 'Terms accepted successfully.');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/books/:bookId/pitch
 * Roles: approved publisher, book owner, admin
 * Returns comprehensive pitch panel payload
 */
router.get(
  '/:bookId/pitch',
  authenticate,
  validate(bookIdParamSchema),
  async (req, res, next) => {
    try {
      const pitch = await pitchService.getPitchPayload(req.params.bookId, req.user);
      sendSuccess(res, pitch, 200, 'Pitch data retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/books/:bookId/pitch/regenerate
 * Roles: owner, admin
 * Regenerates the AI pitch card (limit 3 per day)
 */
router.post(
  '/:bookId/pitch/regenerate',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  validate(bookIdParamSchema),
  async (req, res, next) => {
    try {
      const pitchCard = await pitchService.regeneratePitchCard(req.params.bookId, req.user);
      sendSuccess(res, pitchCard, 200, 'Pitch card regenerated successfully.');
    } catch (err) {
      next(err);
    }
  }
);



/**
 * PATCH /api/books/:bookId
 * Roles: owner, admin (must be active)
 * Updates metadata, template, accent, status, or replaces cover.
 */
router.patch(
  '/:bookId',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  uploadCover,
  validate(bookIdParamSchema),
  validate(updateBookSchema),
  resolveBook,
  requireBookOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const updatedBook = await bookService.updateBook(
        req.params.bookId,
        req.body,
        req.user,
        req.file
      );
      sendSuccess(res, updatedBook, 200, 'Book updated successfully.');
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/books/:bookId
 * Roles: owner, admin (must be active)
 * Cascades to document, analysis records, and cover asset.
 */
router.delete(
  '/:bookId',
  authenticate,
  requireActive,
  authorize(USER_ROLES.WRITER, USER_ROLES.ADMIN),
  validate(bookIdParamSchema),
  resolveBook,
  requireBookOwnerOrAdmin,
  async (req, res, next) => {
    try {
      const result = await bookService.deleteBook(req.params.bookId, req.user);
      sendSuccess(res, null, 200, result.message);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
