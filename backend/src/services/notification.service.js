import Notification from '../models/notification.model.js';
import { emitUserEvent } from '../socket/index.js';
import logger from '../utilities/logger.js';
import { NotFoundError } from '../utilities/custom-errors.js';

export const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  data = {},
}) => {
  const notification = await Notification.create({
    recipientId,
    type,
    title,
    message,
    data,
    read: false,
  });

  try {
    emitUserEvent(recipientId.toString(), 'notification:new', {
      _id: notification._id,
      recipientId: notification.recipientId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      createdAt: notification.createdAt,
    });
  } catch (err) {
    logger.warn(`Failed to emit socket notification to user:${recipientId}: ${err.message}`);
  }

  return notification;
};

export const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const query = { recipientId: userId };
  if (unreadOnly) {
    query.read = false;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipientId: userId, read: false }),
  ]);

  return {
    notifications,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit),
    },
    unreadCount,
  };
};

export const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipientId: userId,
  });

  if (!notification) {
    throw new NotFoundError('Notification not found.');
  }

  notification.read = true;
  await notification.save();
  return notification;
};

export const markAllAsRead = async (userId) => {
  await Notification.updateMany({ recipientId: userId, read: false }, { read: true });
  return { success: true };
};

export const getUnreadCount = async (userId) => {
  const unreadCount = await Notification.countDocuments({ recipientId: userId, read: false });
  return { unreadCount };
};

export default {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
