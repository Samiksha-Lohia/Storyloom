import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import logger from '../utilities/logger.js';
import documentRepository from '../repositories/document.repository.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';
import { detectContactInfo } from '../utilities/contact-filter.js';
import { createNotification } from '../services/notification.service.js';
import { redis } from '../config/redis.js';

let socketServer = null;

const initSocket = (io) => {
  socketServer = io;

  // Connection-level JWT authentication middleware
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!authHeader) {
        return next(new Error('Authentication error: Access token missing.'));
      }

      // Handle both "Bearer <token>" and raw "<token>"
      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      const payload = jwt.verify(token, config.jwt.accessSecret);

      socket.user = {
        id: payload.sub,
        email: payload.email,
        plan: payload.plan,
        role: payload.role,
        status: payload.status,
      };
      next();
    } catch (err) {
      logger.warn(`Socket connection rejected: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired access token.'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user.id}, role: ${socket.user.role})`);

    // Auto-join per-user room for notifications
    socket.join(`user:${socket.user.id}`);
    logger.info(`Socket ${socket.id} joined personal room user:${socket.user.id}`);

    socket.on('document:join', async (documentId) => {
      if (!documentId) return;
      try {
        const document = await documentRepository.findById(documentId);
        if (!document || document.userId.toString() !== socket.user.id.toString()) {
          logger.warn(`Unauthorized join attempt to document:${documentId} by user:${socket.user.id}`);
          socket.emit('error', { message: 'You do not have access to this document.' });
          return;
        }

        socket.join(`document:${documentId}`);
        logger.info(`Socket ${socket.id} successfully joined room document:${documentId}`);
      } catch (err) {
        logger.error(`Error joining room document:${documentId}: ${err.message}`);
        socket.emit('error', { message: 'An error occurred while joining the room.' });
      }
    });

    socket.on('document:leave', (documentId) => {
      if (documentId) {
        socket.leave(`document:${documentId}`);
        logger.info(`Socket ${socket.id} left room document:${documentId}`);
      }
    });

    // ─── Conversation / Chat Handlers ──────────────────────────────────────────
    socket.on('conversation:join', async (conversationId, callback) => {
      if (!conversationId) return;
      try {
        const conversation = await Conversation.findById(conversationId);
        const userId = socket.user.id.toString();
        const isParticipant = conversation && conversation.participants.some(
          (p) => p.toString() === userId
        );
        const isAdmin = socket.user.role === 'admin';

        if (!conversation || (!isParticipant && !isAdmin)) {
          logger.warn(`Unauthorized join attempt to conversation:${conversationId} by user:${userId}`);
          const errRes = { message: 'Conversation not found.' };
          if (typeof callback === 'function') callback(errRes);
          socket.emit('error', errRes);
          return;
        }

        socket.join(`conversation:${conversationId}`);
        logger.info(`Socket ${socket.id} joined conversation:${conversationId}`);
        if (typeof callback === 'function') callback(null, { success: true });
      } catch (err) {
        logger.error(`Error joining conversation room ${conversationId}: ${err.message}`);
        socket.emit('error', { message: 'An error occurred while joining the conversation.' });
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        logger.info(`Socket ${socket.id} left conversation:${conversationId}`);
      }
    });

    socket.on('conversation:typing', async ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      try {
        const conversation = await Conversation.findById(conversationId);
        const userId = socket.user.id.toString();
        if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) {
          return;
        }
        socket.to(`conversation:${conversationId}`).emit('conversation:typing', {
          conversationId,
          userId,
          isTyping: Boolean(isTyping),
        });
      } catch (err) {
        logger.warn(`Error handling conversation:typing: ${err.message}`);
      }
    });

    socket.on('message:read', async ({ conversationId }) => {
      if (!conversationId) return;
      try {
        const userId = socket.user.id.toString();
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) {
          return;
        }

        const now = new Date();
        await Message.updateMany(
          {
            conversationId,
            senderId: { $ne: socket.user.id },
            readAt: null,
          },
          { readAt: now }
        );

        io.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          readerId: userId,
          readAt: now,
        });
      } catch (err) {
        logger.warn(`Error handling message:read: ${err.message}`);
      }
    });

    socket.on('message:send', async ({ conversationId, text }, callback) => {
      try {
        const userId = socket.user.id.toString();

        // 1. Redis rate limit: max 20 messages per minute per user
        const rateLimitKey = `ratelimit:chat:${userId}`;
        const count = await redis.incr(rateLimitKey);
        if (count === 1) {
          await redis.expire(rateLimitKey, 60);
        }
        if (count > 20) {
          const errPayload = {
            message: 'Rate limit exceeded: maximum 20 messages per minute.',
            code: 'RATE_LIMIT_EXCEEDED',
          };
          if (typeof callback === 'function') callback(errPayload);
          socket.emit('error', errPayload);
          return;
        }

        // 2. Fetch conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) {
          const errPayload = { message: 'Conversation not found.' };
          if (typeof callback === 'function') callback(errPayload);
          socket.emit('error', errPayload);
          return;
        }

        if (conversation.status === 'closed') {
          const errPayload = { message: 'This conversation is closed. No new messages can be sent.' };
          if (typeof callback === 'function') callback(errPayload);
          socket.emit('error', errPayload);
          return;
        }

        const trimmedText = (text || '').trim();
        if (!trimmedText) {
          const errPayload = { message: 'Message text cannot be empty.' };
          if (typeof callback === 'function') callback(errPayload);
          socket.emit('error', errPayload);
          return;
        }

        if (trimmedText.length > 2000) {
          const errPayload = { message: 'Message text cannot exceed 2000 characters.' };
          if (typeof callback === 'function') callback(errPayload);
          socket.emit('error', errPayload);
          return;
        }

        // 3. Contact information check (A7 / Spec 13)
        if (!conversation.contactSharingEnabled) {
          const { containsContact, type } = detectContactInfo(trimmedText);
          if (containsContact) {
            const errPayload = {
              message: `Sharing direct contact information (${type}) is prohibited until contact sharing is enabled by the author.`,
              code: 'CONTACT_SHARING_NOT_ALLOWED',
            };
            if (typeof callback === 'function') callback(errPayload);
            socket.emit('error', errPayload);
            return;
          }
        }

        // 4. Persist message
        const message = await Message.create({
          conversationId: conversation._id,
          senderId: userId,
          text: trimmedText,
        });

        conversation.lastMessageAt = new Date();
        await conversation.save();

        const messagePayload = {
          _id: message._id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          text: message.text,
          readAt: message.readAt,
          createdAt: message.createdAt,
        };

        // 5. Emit message:new to room
        io.to(`conversation:${conversationId}`).emit('message:new', messagePayload);

        // 6. Notify offline/unfocused recipient
        const recipientId = conversation.participants.find((p) => p.toString() !== userId);
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
        } catch (notifErr) {
          logger.warn(`Failed to dispatch message notification: ${notifErr.message}`);
        }

        if (typeof callback === 'function') {
          callback(null, messagePayload);
        }
      } catch (err) {
        logger.error(`Error in message:send: ${err.message}`);
        const errPayload = { message: 'An error occurred while sending the message.' };
        if (typeof callback === 'function') callback(errPayload);
        socket.emit('error', errPayload);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

const emitDocumentEvent = (documentId, event, payload = {}) => {
  if (!socketServer || !documentId) return;
  socketServer.to(`document:${documentId}`).emit(event, { documentId, ...payload });
};

const emitUserEvent = (userId, event, payload = {}) => {
  if (!socketServer || !userId) return;
  socketServer.to(`user:${userId}`).emit(event, payload);
};

export { emitDocumentEvent, emitUserEvent, initSocket };

