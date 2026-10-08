import bookRepository from '../repositories/book.repository.js';
import Book from '../models/book.model.js';
import processingJobRepository from '../repositories/processing-job.repository.js';
import * as documentService from './document.service.js';
import * as imageService from './image.service.js';
import { BookDto } from '../dtos/book.dto.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utilities/custom-errors.js';
import { BOOK_STATUSES, BOOK_TEMPLATES_LIST, BOOK_ACCENTS } from '../constants/book.js';
import { USER_ROLES } from '../constants/user-roles.js';
import { TERMS_VERSION } from '../constants/terms.js';
import STAGES from '../constants/stages.js';
import logger from '../utilities/logger.js';
import { redis } from '../config/redis.js';
import Document from '../models/document.model.js';
import Scene from '../models/scene.model.js';
import User from '../models/user.model.js';
import { sliceForPage, pageForOffset } from './paginator.service.js';
import { LibraryService } from './library.service.js';
import Wishlist from '../models/wishlist.model.js';
import PublishRequest from '../models/publish-request.model.js';

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function parseTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => t.toString().trim()).filter(Boolean);
  }
  if (typeof tags === 'string' && tags.trim()) {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed.map((t) => t.toString().trim()).filter(Boolean);
    } catch {
      return tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}

export const createBook = async (userId, files, data) => {
  const manuscriptFile = files?.manuscript?.[0] || files?.file?.[0];
  if (!manuscriptFile) {
    throw new BadRequestError('Manuscript file is required.');
  }

  const isRightsAccepted = data.acceptedRights === true || data.acceptedRights === 'true';
  if (!isRightsAccepted) {
    throw new BadRequestError('You must accept the rights and ownership agreement to publish.');
  }

  const coverFile = files?.cover?.[0];
  let documentResult = null;
  let coverResult = null;

  try {
    documentResult = await documentService.uploadDocument(userId, manuscriptFile, {
      title: data.title,
      returnRaw: true,
    });

    const document = documentResult.document;

    if (coverFile) {
      if (process.env.MOCK_CLOUDINARY_FAIL === 'true') {
        coverResult = await imageService.saveImage(coverFile.buffer, {
          folder: 'platform/covers',
          mimetype: coverFile.mimetype,
        });
      } else {
        try {
          coverResult = await imageService.saveImage(coverFile.buffer, {
            folder: 'platform/covers',
            mimetype: coverFile.mimetype,
          });
        } catch (coverErr) {
          logger.warn(`Cloudinary cover upload failed (proceeding without cover): ${coverErr.message}`);
          coverResult = null;
        }
      }
    }

    const tags = parseTags(data.tags);
    const mature = data.mature === true || data.mature === 'true';
    const template = BOOK_TEMPLATES_LIST.includes(data.template) ? data.template : 'classic';
    const accent = BOOK_ACCENTS.includes(data.accent) ? data.accent : BOOK_ACCENTS[0];

    const pageOffsets = documentResult.pageOffsets || [];
    const pageCount = documentResult.pageCount ?? pageOffsets.length;

    let initialStatus = BOOK_STATUSES.PUBLISHED;
    if (data.status === 'draft') {
      initialStatus = BOOK_STATUSES.DRAFT;
    } else if (data.status === 'processing') {
      initialStatus = BOOK_STATUSES.PROCESSING;
    }

    const book = await bookRepository.create({
      writerId: userId,
      documentId: document._id,
      title: data.title.trim(),
      blurb: data.blurb ? data.blurb.trim() : '',
      coverPublicId: coverResult?.publicId || null,
      coverUrl: coverResult?.url || null,
      genre: data.genre ? data.genre.trim() : 'General',
      tags,
      language: data.language ? data.language.trim() : 'en',
      mature,
      status: initialStatus,
      template,
      accent,
      pageCount,
      pageOffsets,
      acceptedTermsAt: new Date(),
      termsVersion: TERMS_VERSION,
    });

    document.bookId = book._id;
    if (book.language) {
      document.language = book.language;
    }
    await document.save();

    logger.info(`Book ${book._id} created successfully with document ${document._id}.`);
    return BookDto.toResponse(book);
  } catch (err) {
    logger.error(`Error in createBook flow, initiating rollback: ${err.message}`);

    if (coverResult?.publicId) {
      await imageService.deleteImage(coverResult.publicId).catch((cleanupErr) => {
        logger.warn(`Failed to rollback Cloudinary image: ${cleanupErr.message}`);
      });
    }

    if (documentResult?.document?._id) {
      await documentService.deleteDocument(documentResult.document._id).catch((cleanupErr) => {
        logger.warn(`Failed to rollback Document: ${cleanupErr.message}`);
      });
    }

    throw err;
  }
};

export const invalidateCatalogueCache = async () => {
  try {
    const keys = await redis.keys('catalogue:*');
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (_err) {
  }
};

export const getCatalogue = async (query = {}, user = null) => {
  const isAnonymousCatalogue = !user || (!query.wishlisted && user.role !== 'publisher');
  const cacheKey = `catalogue:${JSON.stringify(query)}`;

  if (isAnonymousCatalogue) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_e) {}
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    status: BOOK_STATUSES.PUBLISHED,
  };

  const allowMature = query.mature === true || query.mature === 'true';
  if (!allowMature) {
    filter.mature = { $ne: true };
  }

  if (query.genre && query.genre.trim()) {
    const rawGenre = query.genre.trim();
    if (/^sci-?fi$/i.test(rawGenre) || /^science fiction$/i.test(rawGenre)) {
      filter.genre = { $regex: /^(Sci-Fi|Science Fiction)$/i };
    } else {
      filter.genre = { $regex: new RegExp(`^${escapeRegex(rawGenre)}$`, 'i') };
    }
  }

  if (query.tag && query.tag.trim()) {
    filter.tags = { $in: [new RegExp(`^${escapeRegex(query.tag.trim())}$`, 'i')] };
  }

  if (query.minRating !== undefined && query.minRating !== '') {
    const minRating = parseFloat(query.minRating);
    if (!isNaN(minRating)) {
      filter['stats.ratingAvg'] = { $gte: minRating };
    }
  }

  if (query.completionMin !== undefined && query.completionMin !== '') {
    const completionMin = parseFloat(query.completionMin);
    if (!isNaN(completionMin)) {
      filter['stats.completionRate'] = { $gte: completionMin };
    }
  }

  const lengthBucket = query.lengthBucket || query.length;
  if (lengthBucket) {
    if (lengthBucket === 'short') {
      filter.pageCount = { $gt: 0, $lt: 150 };
    } else if (lengthBucket === 'medium') {
      filter.pageCount = { $gte: 150, $lte: 350 };
    } else if (lengthBucket === 'long') {
      filter.pageCount = { $gt: 350 };
    }
  }

  if (query.wishlisted === true || query.wishlisted === 'true') {
    const isApprovedPublisher = user && user.role === 'publisher' && user.status === 'active';
    if (isApprovedPublisher) {
      const wishlists = await Wishlist.find({ publisherId: user.id || user._id }).select('bookId').lean();
      const bookIds = wishlists.map((w) => w.bookId);
      filter._id = { $in: bookIds };
    } else {
      filter._id = { $in: [] };
    }
  }

  if (query.search && query.search.trim()) {
    const term = escapeRegex(query.search.trim());
    filter.$or = [
      { title: { $regex: new RegExp(term, 'i') } },
      { tags: { $in: [new RegExp(term, 'i')] } },
    ];
  }

  let sort = { createdAt: -1 };
  if (
    query.sort === 'trending' ||
    query.sort === '-stats.readCount' ||
    query.sort === '-stats.reads' ||
    query.sort === 'reads'
  ) {
    sort = { 'stats.reads': -1, createdAt: -1 };
  } else if (
    query.sort === 'rating' ||
    query.sort === '-stats.rating' ||
    query.sort === '-stats.ratingAvg'
  ) {
    sort = { 'stats.ratingAvg': -1, 'stats.ratingCount': -1, createdAt: -1 };
  } else if (query.sort === 'new' || query.sort === '-createdAt') {
    sort = { createdAt: -1 };
  } else if (query.sort === 'title') {
    sort = { title: 1 };
  } else if (query.sort === 'completion') {
    sort = { 'stats.completionRate': -1, createdAt: -1 };
  }

  const [total, books] = await Promise.all([
    Book.countDocuments(filter),
    Book.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('writerId', 'name username avatarUrl')
      .exec(),
  ]);

  let wishlistedIds = new Set();
  let inTalksIds = new Set();
  if (user && user.role === 'publisher' && user.status === 'active') {
    const bookIds = books.map((b) => b._id);
    const [pubWishlists, pubRequests] = await Promise.all([
      Wishlist.find({
        publisherId: user.id || user._id,
        bookId: { $in: bookIds },
      }).select('bookId').lean(),
      PublishRequest.find({
        bookId: { $in: bookIds },
        status: 'accepted',
      }).select('bookId').lean(),
    ]);
    wishlistedIds = new Set(pubWishlists.map((w) => w.bookId.toString()));
    inTalksIds = new Set(pubRequests.map((r) => r.bookId.toString()));
  }

  const results = BookDto.toResponseList(books).map((bookDto) => ({
    ...bookDto,
    isWishlisted: wishlistedIds.has(bookDto.id),
    inTalks: inTalksIds.has(bookDto.id),
  }));

  const responsePayload = {
    results,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };

  if (isAnonymousCatalogue) {
    try {
      await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', 60);
    } catch (_cacheErr) {
    }
  }

  return responsePayload;
};

export const getWriterBooks = async (writerId) => {
  const books = await Book.find({
    writerId,
    status: { $ne: BOOK_STATUSES.REMOVED },
  })
    .sort({ createdAt: -1 })
    .populate('writerId', 'name username avatarUrl')
    .exec();

  return BookDto.toResponseList(books);
};

export const getBookById = async (bookId, user = null) => {
  const book = await Book.findById(bookId).populate('writerId', 'name username avatarUrl');
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  if (book.status !== BOOK_STATUSES.PUBLISHED) {
    const isOwner = user && (book.writerId._id || book.writerId).toString() === user.id.toString();
    const isAdmin = user && user.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new NotFoundError('Book not found.');
    }
  }

  return BookDto.toResponse(book);
};

export const updateBook = async (bookId, updateData, user, newCoverFile = null) => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  const isOwner = book.writerId.toString() === user.id.toString();
  const isAdmin = user.role === USER_ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You do not have permission to modify this book.');
  }

  if (newCoverFile) {
    try {
      const newCover = await imageService.saveImage(newCoverFile.buffer, {
        folder: 'platform/covers',
        mimetype: newCoverFile.mimetype,
      });
      if (book.coverPublicId) {
        await imageService.deleteImage(book.coverPublicId).catch(() => {});
      }
      book.coverPublicId = newCover.publicId;
      book.coverUrl = newCover.url;
    } catch (coverErr) {
      logger.warn(`Cloudinary cover update failed: ${coverErr.message}`);
    }
  }

  if (updateData.status && updateData.status !== book.status) {
    const nextStatus = updateData.status;

    if (nextStatus === BOOK_STATUSES.PUBLISHED) {
      if (!book.acceptedTermsAt) {
        book.acceptedTermsAt = new Date();
        book.termsVersion = TERMS_VERSION;
      }
      const parsingJob = await processingJobRepository.findOne({
        documentId: book.documentId,
        stage: STAGES.PARSING,
      });

      if (!parsingJob || parsingJob.status !== 'completed') {
        throw new BadRequestError('Manuscript parsing must complete before the book can be published.');
      }
      if (!book.pageCount || book.pageCount <= 0) {
        throw new BadRequestError('Book must have at least one paginated page before it can be published.');
      }
      book.status = BOOK_STATUSES.PUBLISHED;
    } else if (nextStatus === BOOK_STATUSES.UNPUBLISHED) {
      book.status = BOOK_STATUSES.UNPUBLISHED;
    } else if (nextStatus === BOOK_STATUSES.REMOVED) {
      if (!isAdmin) {
        throw new ForbiddenError('Only administrators can remove books from the platform.');
      }
      book.status = BOOK_STATUSES.REMOVED;
    } else if (nextStatus === BOOK_STATUSES.DRAFT) {
      book.status = BOOK_STATUSES.DRAFT;
    } else {
      throw new BadRequestError(`Cannot manually transition to status: ${nextStatus}`);
    }
  }

  if (updateData.title !== undefined) book.title = updateData.title.trim();
  if (updateData.blurb !== undefined) book.blurb = updateData.blurb.trim();
  if (updateData.genre !== undefined) book.genre = updateData.genre.trim();
  if (updateData.tags !== undefined) book.tags = parseTags(updateData.tags);
  if (updateData.language !== undefined) book.language = updateData.language.trim();
  if (updateData.mature !== undefined) {
    book.mature = updateData.mature === true || updateData.mature === 'true';
  }
  if (updateData.template && BOOK_TEMPLATES_LIST.includes(updateData.template)) {
    book.template = updateData.template;
  }
  if (updateData.accent && BOOK_ACCENTS.includes(updateData.accent)) {
    book.accent = updateData.accent;
  }

  await book.save();
  await invalidateCatalogueCache();
  return BookDto.toResponse(book);
};

export const deleteBook = async (bookId, user) => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  const isOwner = book.writerId.toString() === user.id.toString();
  const isAdmin = user.role === USER_ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You do not have permission to delete this book.');
  }

  if (book.coverPublicId) {
    await imageService.deleteImage(book.coverPublicId);
  }

  try {
    await redis.del(`book:${book._id}:pages:text`);
  } catch (cacheErr) {
  }

  await documentService.deleteDocument(book.documentId);

  await bookRepository.deleteById(book._id);
  await invalidateCatalogueCache();
  logger.info(`Book ${bookId} deleted successfully.`);

  return { success: true, message: 'Book deleted successfully.' };
};

export const getBookPages = async (bookId, user, { from = 1, to = null } = {}) => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  const isOwner = user && book.writerId && book.writerId.toString() === user.id.toString();
  const isAdmin = user && user.role === USER_ROLES.ADMIN;

  if (book.status !== BOOK_STATUSES.PUBLISHED && !isOwner && !isAdmin) {
    throw new NotFoundError('Book not found.');
  }

  if (book.mature && !isOwner && !isAdmin) {
    let hasAck = Boolean(user?.matureAckAt);
    if (!hasAck && user) {
      const dbUser = await User.findById(user.id).select('matureAckAt');
      hasAck = Boolean(dbUser?.matureAckAt);
    }
    if (!hasAck) {
      throw new ForbiddenError(
        'This content contains 18+ mature themes and requires acknowledgement.',
        'MATURE_ACK_REQUIRED'
      );
    }
  }

  const fromPage = Math.max(1, parseInt(from, 10) || 1);
  const toPage = to !== null && to !== undefined ? Math.max(1, parseInt(to, 10)) : fromPage;

  if (toPage < fromPage) {
    throw new BadRequestError('Parameter "to" must be greater than or equal to "from".');
  }

  const windowSize = toPage - fromPage + 1;
  if (windowSize > 5) {
    throw new BadRequestError('Page window cannot exceed 5 pages at a time.');
  }

  const pageCount = book.pageCount || 0;
  const pageOffsets = book.pageOffsets || [];

  if (pageCount === 0 || pageOffsets.length === 0) {
    return { pages: [], pageCount: 0 };
  }

  const cacheKey = `book:${book._id}:pages:text`;
  let fullText = null;

  try {
    fullText = await redis.get(cacheKey);
  } catch (cacheErr) {
    logger.warn(`Redis get cache error for book ${bookId}: ${cacheErr.message}`);
  }

  if (!fullText) {
    const doc = await Document.findById(book.documentId).select('+parsedText');
    if (!doc || !doc.parsedText) {
      throw new NotFoundError('Manuscript text not found for this book.');
    }
    fullText = doc.parsedText;

    try {
      await redis.set(cacheKey, fullText, 'EX', 3600);
    } catch (setErr) {
      logger.warn(`Redis set cache error for book ${bookId}: ${setErr.message}`);
    }
  }

  const pages = [];
  const endLimit = Math.min(toPage, pageCount);

  for (let p = fromPage; p <= endLimit; p++) {
    const pageContent = sliceForPage(fullText, pageOffsets, p);
    pages.push({
      page: p,
      text: pageContent,
    });
  }

  if (user) {
    await LibraryService.recordPageRead(user.id, book, { from: fromPage, to: toPage });
  }

  return {
    pages,
    pageCount,
  };
};

export const getSceneMarkers = async (bookId, user) => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  const isOwner = user && book.writerId && book.writerId.toString() === user.id.toString();
  const isAdmin = user && user.role === USER_ROLES.ADMIN;

  if (book.status !== BOOK_STATUSES.PUBLISHED && !isOwner && !isAdmin) {
    throw new NotFoundError('Book not found.');
  }

  if (book.mature && !isOwner && !isAdmin) {
    let hasAck = Boolean(user?.matureAckAt);
    if (!hasAck && user) {
      const dbUser = await User.findById(user.id).select('matureAckAt');
      hasAck = Boolean(dbUser?.matureAckAt);
    }
    if (!hasAck) {
      throw new ForbiddenError(
        'This content contains 18+ mature themes and requires acknowledgement.',
        'MATURE_ACK_REQUIRED'
      );
    }
  }

  const pageOffsets = book.pageOffsets || [];
  if (pageOffsets.length === 0) {
    return { markers: [] };
  }

  const scenes = await Scene.find({ documentId: book.documentId })
    .select('textRange.start sceneNumber')
    .sort({ 'textRange.start': 1 })
    .lean();

  const markerPages = scenes.map((s) => pageForOffset(pageOffsets, s.textRange.start));
  const uniqueSorted = [...new Set(markerPages)].sort((a, b) => a - b);

  return {
    markers: uniqueSorted,
  };
};

export const acceptTerms = async (bookId, user) => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  const isOwner = book.writerId.toString() === (user.id || user._id).toString();
  const isAdmin = user.role === USER_ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You can only accept terms for your own book.');
  }

  book.termsVersion = TERMS_VERSION;
  book.acceptedTermsAt = new Date();
  await book.save();

  logger.info(`Terms accepted for book ${book._id} (version ${TERMS_VERSION})`);
  return BookDto.toResponse(book);
};

export default {
  createBook,
  getCatalogue,
  getBookById,
  updateBook,
  deleteBook,
  getBookPages,
  getSceneMarkers,
  acceptTerms,
};

