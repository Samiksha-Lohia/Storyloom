import mongoose from 'mongoose';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import PublishRequest from '../models/publish-request.model.js';
import Book from '../models/book.model.js';
import User from '../models/user.model.js';
import Report from '../models/report.model.js';
import AuditLog from '../models/audit-log.model.js';
import { detectContactInfo } from '../utilities/contact-filter.js';
import { createNotification } from './notification.service.js';
import {
  CONVERSATION_STATUSES,
  PUBLISH_REQUEST_STATUSES,
} from '../constants/publish-request.js';
import { USER_ROLES } from '../constants/user-roles.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../utilities/custom-errors.js';
import logger from '../utilities/logger.js';

export const listUserConversations = async (user, { page = 1, limit = 20 } = {}) => {
  const userId = new mongoose.Types.ObjectId(user.id || user._id);
  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const filter = { participants: userId };

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .populate('participants', 'name username avatarUrl role publisherProfile')
      .populate('bookId', 'title coverUrl genre writerId')
      .populate('requestId', 'status company rights proposedTerms note')
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  const enhanced = await Promise.all(
    conversations.map(async (c) => {
      const [unreadCount, lastMessage] = await Promise.all([
        Message.countDocuments({
          conversationId: c._id,
          senderId: { $ne: userId },
          readAt: null,
        }),
        Message.findOne({ conversationId: c._id })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const otherParticipant = (c.participants || []).find(
        (p) => (p._id || p).toString() !== userId.toString()
      );

      return {
        ...c,
        otherParticipant,
        unreadCount,
        lastMessage,
      };
    })
  );

  return {
    results: enhanced,
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit) || 1,
    },
  };
};

export const getConversationById = async (user, conversationId) => {
  const userId = (user.id || user._id).toString();

  const conversation = await Conversation.findById(conversationId)
    .populate('participants', 'name username avatarUrl role publisherProfile')
    .populate('bookId', 'title coverUrl genre writerId')
    .populate('requestId', 'status company rights proposedTerms note contactName contactEmail')
    .lean();

  if (!conversation) {
    throw new NotFoundError('Conversation not found.');
  }

  const isParticipant = (conversation.participants || []).some(
    (p) => (p._id || p).toString() === userId
  );
  const isAdmin = user.role === USER_ROLES.ADMIN;

  if (!isParticipant && !isAdmin) {
    throw new NotFoundError('Conversation not found.');
  }

  const otherParticipant = (conversation.participants || []).find(
    (p) => (p._id || p).toString() !== userId
  );

  return {
    ...conversation,
    otherParticipant,
  };
};

export const getConversationMessages = async (user, conversationId, { before, limit = 30 } = {}) => {
  const userId = (user.id || user._id).toString();

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found.');
  }

  const isParticipant = conversation.participants.some((p) => p.toString() === userId);
  const isAdmin = user.role === USER_ROLES.ADMIN;

  if (!isParticipant && !isAdmin) {
    throw new NotFoundError('Conversation not found.');
  }

  const query = { conversationId };

  if (before) {
    if (mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    } else {
      const date = new Date(before);
      if (!isNaN(date.getTime())) {
        query.createdAt = { $lt: date };
      }
    }
  }

  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(numericLimit)
    .lean();

  if (isParticipant) {
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        readAt: null,
      },
      { readAt: new Date() }
    );
  }

  return {
    messages: messages.reverse(),
    hasMore: messages.length === numericLimit,
  };
};

export const sendMessage = async (user, conversationId, text, { io } = {}) => {
  const userId = (user.id || user._id).toString();

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found.');
  }

  const isParticipant = conversation.participants.some((p) => p.toString() === userId);
  if (!isParticipant) {
    throw new NotFoundError('Conversation not found.');
  }

  if (conversation.status === CONVERSATION_STATUSES.CLOSED) {
    throw new BadRequestError('This conversation is closed. No new messages can be sent.');
  }

  const trimmedText = (text || '').trim();
  if (!trimmedText) {
    throw new BadRequestError('Message text cannot be empty.');
  }
  if (trimmedText.length > 2000) {
    throw new BadRequestError('Message text cannot exceed 2000 characters.');
  }

  if (!conversation.contactSharingEnabled) {
    const { containsContact, type } = detectContactInfo(trimmedText);
    if (containsContact) {
      throw new BadRequestError(
        `Sharing direct contact information (${type}: email, phone, or web link) is prohibited until the author explicitly enables contact sharing for this conversation.`,
        'CONTACT_SHARING_NOT_ALLOWED'
      );
    }
  }

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: userId,
    text: trimmedText,
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  const recipientId = conversation.participants.find((p) => p.toString() !== userId);

  if (io) {
    io.to(`conversation:${conversationId}`).emit('message:new', {
      _id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      text: message.text,
      readAt: message.readAt,
      createdAt: message.createdAt,
    });
  }

  try {
    const sender = await User.findById(userId).select('name');
    const senderName = sender ? sender.name : 'Someone';
    await createNotification({
      recipientId,
      type: 'chat_message',
      title: 'New Message',
      message: `${senderName}: "${trimmedText.length > 60 ? trimmedText.slice(0, 57) + '...' : trimmedText}"`,
      data: {
        conversationId: conversation._id,
        messageId: message._id,
        senderId: userId,
      },
    });
  } catch (err) {
    logger.warn(`Failed to dispatch message notification: ${err.message}`);
  }

  return message;
};

export const updateConversation = async (user, conversationId, { status, contactSharingEnabled }) => {
  const userId = (user.id || user._id).toString();

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new NotFoundError('Conversation not found.');
  }

  const isParticipant = conversation.participants.some((p) => p.toString() === userId);
  const isAdmin = user.role === USER_ROLES.ADMIN;

  if (!isParticipant && !isAdmin) {
    throw new NotFoundError('Conversation not found.');
  }

  const book = await Book.findById(conversation.bookId);
  const isWriter = book && book.writerId.toString() === userId;

  if (status === CONVERSATION_STATUSES.CLOSED) {
    conversation.status = CONVERSATION_STATUSES.CLOSED;
    await PublishRequest.findByIdAndUpdate(conversation.requestId, {
      status: PUBLISH_REQUEST_STATUSES.CLOSED,
    });
  }

  if (contactSharingEnabled !== undefined) {
    if (!isWriter && !isAdmin) {
      throw new ForbiddenError('Only the book author can toggle contact sharing.');
    }
    conversation.contactSharingEnabled = Boolean(contactSharingEnabled);
  }

  await conversation.save();
  return conversation;
};

export const adminGetConversation = async (adminUser, conversationId, reportId) => {
  if (adminUser.role !== USER_ROLES.ADMIN) {
    throw new ForbiddenError('Administrative privileges required.');
  }

  if (!reportId) {
    throw new ForbiddenError(
      'Administrative access to conversations requires an active reportId.',
      'REPORT_REQUIRED'
    );
  }

  const report = await Report.findById(reportId);
  if (!report || report.status === 'closed') {
    throw new ForbiddenError(
      'An open or active report is required to access user conversations.',
      'INVALID_REPORT'
    );
  }

  const conversation = await Conversation.findById(conversationId)
    .populate('participants', 'name username email role publisherProfile')
    .populate('bookId', 'title coverUrl genre writerId')
    .populate('requestId')
    .lean();

  if (!conversation) {
    throw new NotFoundError('Conversation not found.');
  }

  const participantIds = (conversation.participants || []).map((p) => (p._id || p).toString());
  const targetIdStr = report.targetId.toString();

  const targetsParticipant = participantIds.includes(targetIdStr);
  const targetsConversation = targetIdStr === conversationId.toString();
  const targetsBook = conversation.bookId && (conversation.bookId._id || conversation.bookId).toString() === targetIdStr;

  if (!targetsParticipant && !targetsConversation && !targetsBook) {
    throw new ForbiddenError(
      'The specified report does not target this conversation or any of its participants.',
      'REPORT_TARGET_MISMATCH'
    );
  }

  await AuditLog.create({
    actor: adminUser.id || adminUser._id,
    action: 'conversation_read',
    targetType: 'conversation',
    targetId: conversationId.toString(),
    meta: {
      reportId: report._id.toString(),
      reportReason: report.reason,
      participants: participantIds,
    },
    at: new Date(),
  });

  const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).lean();

  return {
    conversation,
    messages,
    report: {
      _id: report._id,
      reason: report.reason,
      status: report.status,
    },
  };
};

export default {
  listUserConversations,
  getConversationById,
  getConversationMessages,
  sendMessage,
  updateConversation,
  adminGetConversation,
};
