import mongoose from 'mongoose';
import PublishRequest from '../models/publish-request.model.js';
import Conversation from '../models/conversation.model.js';
import Book from '../models/book.model.js';
import User from '../models/user.model.js';
import Block from '../models/block.model.js';
import { createNotification } from './notification.service.js';
import {
  PUBLISH_REQUEST_STATUSES,
  CONVERSATION_STATUSES,
  COOLDOWN_MS,
} from '../constants/publish-request.js';
import { BOOK_STATUSES } from '../constants/book.js';
import { USER_ROLES, USER_STATUSES } from '../constants/user-roles.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../utilities/custom-errors.js';
import logger from '../utilities/logger.js';

/**
 * Create a new publish request (approved publisher only).
 */
export const createPublishRequest = async (publisherUser, data) => {
  const publisherId = publisherUser.id || publisherUser._id;

  // 1. Role and approval check from database record
  const publisher = await User.findById(publisherId);
  if (
    !publisher ||
    publisher.role !== USER_ROLES.PUBLISHER ||
    publisher.status !== USER_STATUSES.ACTIVE ||
    publisher.publisherProfile?.reviewStatus !== 'approved'
  ) {
    throw new ForbiddenError(
      'Only approved active publishers can create publishing requests.',
      'PUBLISHER_PENDING'
    );
  }

  // 2. Validate Book
  const book = await Book.findById(data.bookId);
  if (!book) {
    throw new NotFoundError('Book not found.');
  }

  if (book.status !== BOOK_STATUSES.PUBLISHED) {
    throw new BadRequestError('Publishing requests can only be sent for published books.');
  }

  const writerId = book.writerId;

  // 3. Prevent self-requests (if publisher is also writer)
  if (writerId.toString() === publisherId.toString()) {
    throw new BadRequestError('You cannot send a publishing request to yourself.');
  }

  // 4. Check if writer has blocked this publisher
  const isBlocked = await Block.findOne({ blockerId: writerId, blockedId: publisherId });
  if (isBlocked) {
    throw new ForbiddenError('You are blocked from contacting this author.');
  }

  // 5. Check for active cooldown from previous declined request
  const recentDeclined = await PublishRequest.findOne({
    publisherId,
    bookId: book._id,
    status: PUBLISH_REQUEST_STATUSES.DECLINED,
    cooldownUntil: { $gt: new Date() },
  }).sort({ cooldownUntil: -1 });

  if (recentDeclined) {
    const remainingDays = Math.ceil((recentDeclined.cooldownUntil - new Date()) / (24 * 60 * 60 * 1000));
    throw new ForbiddenError(
      `A 30-day cooldown is active for this book following a previous decline. You may reapply in ${remainingDays} day(s).`,
      'REQUEST_COOLDOWN'
    );
  }

  // 6. Check for existing active request (pending or accepted)
  const existingActive = await PublishRequest.findOne({
    publisherId,
    bookId: book._id,
    status: { $in: [PUBLISH_REQUEST_STATUSES.PENDING, PUBLISH_REQUEST_STATUSES.ACCEPTED] },
  });

  if (existingActive) {
    throw new ConflictError(
      `An active publish request (${existingActive.status}) already exists for this book.`,
      'ACTIVE_REQUEST_EXISTS'
    );
  }

  // 7. Create request record
  const request = await PublishRequest.create({
    bookId: book._id,
    publisherId,
    writerId,
    company: data.company,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    proposedTerms: data.proposedTerms,
    message: data.message,
    rights: data.rights,
    status: PUBLISH_REQUEST_STATUSES.PENDING,
  });

  // 8. Notify the writer
  try {
    await createNotification({
      recipientId: writerId,
      type: 'request_received',
      title: 'New Publishing Request',
      message: `${data.company} submitted a publishing request for "${book.title}".`,
      data: {
        requestId: request._id,
        bookId: book._id,
        company: data.company,
      },
    });
  } catch (err) {
    logger.warn(`Failed to notify writer of new publish request: ${err.message}`);
  }

  return request;
};

/**
 * List publish requests scoped to the caller's role.
 */
export const listPublishRequests = async (user, { status, page = 1, limit = 20 } = {}) => {
  const userId = user.id || user._id;
  const filter = {};

  if (user.role === USER_ROLES.PUBLISHER) {
    filter.publisherId = userId;
  } else if (user.role === USER_ROLES.WRITER) {
    filter.writerId = userId;
  } else if (user.role === USER_ROLES.ADMIN) {
    // Admin can see all
  } else {
    return { results: [], pagination: { total: 0, page: 1, limit, totalPages: 1 } };
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [requests, total] = await Promise.all([
    PublishRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .populate('bookId', 'title coverUrl genre blurb status')
      .populate('publisherId', 'name username avatarUrl publisherProfile')
      .populate('writerId', 'name username avatarUrl')
      .lean(),
    PublishRequest.countDocuments(filter),
  ]);

  return {
    results: requests,
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit) || 1,
    },
  };
};

/**
 * Get request by ID with participant/admin authorization.
 */
export const getPublishRequestById = async (user, requestId) => {
  const userId = (user.id || user._id).toString();

  const request = await PublishRequest.findById(requestId)
    .populate('bookId', 'title coverUrl genre blurb status')
    .populate('publisherId', 'name username avatarUrl publisherProfile')
    .populate('writerId', 'name username avatarUrl')
    .lean();

  if (!request) {
    throw new NotFoundError('Publish request not found.');
  }

  const isPublisher = request.publisherId?._id?.toString() === userId || request.publisherId?.toString() === userId;
  const isWriter = request.writerId?._id?.toString() === userId || request.writerId?.toString() === userId;
  const isAdmin = user.role === USER_ROLES.ADMIN;

  if (!isPublisher && !isWriter && !isAdmin) {
    throw new ForbiddenError('You do not have permission to view this publish request.');
  }

  return request;
};

/**
 * Update publish request status (accept, decline, withdraw, close).
 */
export const updatePublishRequestStatus = async (user, requestId, { action, note = '' }) => {
  const userId = (user.id || user._id).toString();

  const request = await PublishRequest.findById(requestId);
  if (!request) {
    throw new NotFoundError('Publish request not found.');
  }

  const book = await Book.findById(request.bookId);
  const bookTitle = book ? book.title : 'your book';

  const isPublisher = request.publisherId.toString() === userId;
  const isWriter = request.writerId.toString() === userId;
  const isAdmin = user.role === USER_ROLES.ADMIN;

  switch (action) {
    case 'accept': {
      // Writer only
      if (!isWriter && !isAdmin) {
        throw new ForbiddenError('Only the book author can accept a publishing request.');
      }
      if (request.status !== PUBLISH_REQUEST_STATUSES.PENDING) {
        throw new BadRequestError(`Cannot accept a request with status "${request.status}". Only pending requests can be accepted.`);
      }

      request.status = PUBLISH_REQUEST_STATUSES.ACCEPTED;
      if (note) request.note = note;

      // Create conversation
      let conversation = await Conversation.findOne({ requestId: request._id });
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [request.publisherId, request.writerId],
          requestId: request._id,
          bookId: request.bookId,
          status: CONVERSATION_STATUSES.OPEN,
          contactSharingEnabled: false,
          lastMessageAt: new Date(),
        });
      }
      request.conversationId = conversation._id;
      await request.save();

      // Notify publisher
      try {
        await createNotification({
          recipientId: request.publisherId,
          type: 'request_accepted',
          title: 'Publishing Request Accepted',
          message: `The author accepted your request for "${bookTitle}". A conversation has been opened.`,
          data: {
            requestId: request._id,
            conversationId: conversation._id,
            bookId: request.bookId,
          },
        });
      } catch (err) {
        logger.warn(`Failed to notify publisher of accepted request: ${err.message}`);
      }

      return { request, conversation };
    }

    case 'decline': {
      // Writer only
      if (!isWriter && !isAdmin) {
        throw new ForbiddenError('Only the book author can decline a publishing request.');
      }
      if (request.status !== PUBLISH_REQUEST_STATUSES.PENDING) {
        throw new BadRequestError(`Cannot decline a request with status "${request.status}". Only pending requests can be declined.`);
      }

      request.status = PUBLISH_REQUEST_STATUSES.DECLINED;
      request.cooldownUntil = new Date(Date.now() + COOLDOWN_MS);
      if (note) request.note = note;
      await request.save();

      // Notify publisher
      try {
        await createNotification({
          recipientId: request.publisherId,
          type: 'request_declined',
          title: 'Publishing Request Declined',
          message: `The author declined your publishing request for "${bookTitle}".`,
          data: {
            requestId: request._id,
            bookId: request.bookId,
            cooldownUntil: request.cooldownUntil,
          },
        });
      } catch (err) {
        logger.warn(`Failed to notify publisher of declined request: ${err.message}`);
      }

      return { request };
    }

    case 'withdraw': {
      // Publisher only
      if (!isPublisher && !isAdmin) {
        throw new ForbiddenError('Only the requesting publisher can withdraw this request.');
      }
      if (request.status !== PUBLISH_REQUEST_STATUSES.PENDING) {
        throw new BadRequestError(`Cannot withdraw a request with status "${request.status}". Only pending requests can be withdrawn.`);
      }

      request.status = PUBLISH_REQUEST_STATUSES.WITHDRAWN;
      if (note) request.note = note;
      await request.save();

      // Notify writer
      try {
        await createNotification({
          recipientId: request.writerId,
          type: 'request_withdrawn',
          title: 'Publishing Request Withdrawn',
          message: `The publisher withdrew their publishing request for "${bookTitle}".`,
          data: {
            requestId: request._id,
            bookId: request.bookId,
          },
        });
      } catch (err) {
        logger.warn(`Failed to notify writer of withdrawn request: ${err.message}`);
      }

      return { request };
    }

    case 'close': {
      // Either participant or admin
      if (!isPublisher && !isWriter && !isAdmin) {
        throw new ForbiddenError('Only participants or admins can close an accepted request.');
      }
      if (request.status !== PUBLISH_REQUEST_STATUSES.ACCEPTED) {
        throw new BadRequestError(`Cannot close a request with status "${request.status}". Only accepted requests can be closed.`);
      }

      request.status = PUBLISH_REQUEST_STATUSES.CLOSED;
      if (note) request.note = note;
      await request.save();

      // Also close associated conversation if open
      if (request.conversationId) {
        await Conversation.findByIdAndUpdate(request.conversationId, {
          status: CONVERSATION_STATUSES.CLOSED,
        });
      }

      // Notify other participant
      const otherParticipantId = isPublisher ? request.writerId : request.publisherId;
      try {
        await createNotification({
          recipientId: otherParticipantId,
          type: 'request_closed',
          title: 'Publishing Negotiation Closed',
          message: `The publishing negotiation for "${bookTitle}" has been closed.`,
          data: {
            requestId: request._id,
            bookId: request.bookId,
          },
        });
      } catch (err) {
        logger.warn(`Failed to notify participant of closed request: ${err.message}`);
      }

      return { request };
    }

    default:
      throw new BadRequestError(`Unsupported action "${action}".`);
  }
};

/**
 * Block a publisher from sending future requests to this writer.
 */
export const blockPublisher = async (writerId, publisherId, reason = '') => {
  const publisher = await User.findById(publisherId);
  if (!publisher || publisher.role !== USER_ROLES.PUBLISHER) {
    throw new NotFoundError('Publisher not found.');
  }

  const block = await Block.findOneAndUpdate(
    { blockerId: writerId, blockedId: publisherId },
    { blockerId: writerId, blockedId: publisherId, reason: reason || '' },
    { upsert: true, new: true }
  );

  return block;
};

/**
 * Unblock a publisher.
 */
export const unblockPublisher = async (writerId, publisherId) => {
  const result = await Block.findOneAndDelete({
    blockerId: writerId,
    blockedId: publisherId,
  });
  return !!result;
};

/**
 * List blocked publishers for a writer.
 */
export const listBlockedPublishers = async (writerId) => {
  const blocks = await Block.find({ blockerId: writerId })
    .populate('blockedId', 'name username avatarUrl publisherProfile')
    .lean();
  return blocks;
};

export default {
  createPublishRequest,
  listPublishRequests,
  getPublishRequestById,
  updatePublishRequestStatus,
  blockPublisher,
  unblockPublisher,
  listBlockedPublishers,
};
