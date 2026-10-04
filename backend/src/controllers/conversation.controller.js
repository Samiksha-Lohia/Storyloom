import * as conversationService from '../services/conversation.service.js';
import {
  sendMessageSchema,
  updateConversationSchema,
  getMessagesSchema,
} from '../validators/conversation.validator.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utilities/response.js';
import { BadRequestError } from '../utilities/custom-errors.js';

export const list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await conversationService.listUserConversations(req.user, { page, limit });
    return sendPaginated(
      res,
      result.results,
      result.pagination,
      'Conversations retrieved successfully.'
    );
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const conversation = await conversationService.getConversationById(req.user, req.params.id);
    return sendSuccess(res, conversation, 200, 'Conversation retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { error, value } = getMessagesSchema.validate(req.query);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }
    const result = await conversationService.getConversationMessages(req.user, req.params.id, value);
    return sendSuccess(res, result, 200, 'Messages retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }
    const io = req.app.get('io');
    const message = await conversationService.sendMessage(req.user, req.params.id, value.text, { io });
    return sendCreated(res, message, 'Message sent successfully.');
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { error, value } = updateConversationSchema.validate(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }
    const conversation = await conversationService.updateConversation(req.user, req.params.id, value);
    return sendSuccess(res, conversation, 200, 'Conversation updated successfully.');
  } catch (err) {
    next(err);
  }
};

export const adminGet = async (req, res, next) => {
  try {
    const { reportId } = req.query;
    const result = await conversationService.adminGetConversation(req.user, req.params.id, reportId);
    return sendSuccess(res, result, 200, 'Conversation retrieved under administrative audit.');
  } catch (err) {
    next(err);
  }
};

export default {
  list,
  getById,
  getMessages,
  sendMessage,
  update,
  adminGet,
};
