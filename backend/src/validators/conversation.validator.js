import Joi from 'joi';

export const sendMessageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': 'Message cannot be empty.',
    'string.max': 'Message cannot exceed 2000 characters.',
    'any.required': 'Message text is required.',
  }),
});

export const updateConversationSchema = Joi.object({
  status: Joi.string().valid('closed').optional(),
  contactSharingEnabled: Joi.boolean().optional(),
}).min(1);

export const getMessagesSchema = Joi.object({
  before: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(30),
});
