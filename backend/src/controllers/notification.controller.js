import * as notificationService from '../services/notification.service.js';
import { sendSuccess } from '../utilities/response.js';

export const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
      unreadOnly: req.query.unreadOnly === 'true',
    });
    sendSuccess(res, result, 200, 'Notifications retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.user.id, req.params.id);
    sendSuccess(res, notification, 200, 'Notification marked as read.');
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    sendSuccess(res, result, 200, 'All notifications marked as read.');
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user.id);
    sendSuccess(res, result, 200, 'Unread notification count retrieved.');
  } catch (err) {
    next(err);
  }
};

export default {
  getNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
};
