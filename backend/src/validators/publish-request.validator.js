import Joi from 'joi';
import {
  ALLOWED_RIGHTS,
  PUBLISH_REQUEST_STATUSES_LIST,
} from '../constants/publish-request.js';

export const createPublishRequestSchema = Joi.object({
  bookId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'bookId must be a valid ObjectId.',
    'string.length': 'bookId must be a valid 24-character hexadecimal ObjectId.',
    'any.required': 'bookId is required.',
  }),
  company: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Company is required.',
    'string.max': 'Company name cannot exceed 100 characters.',
  }),
  contactName: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Contact name is required.',
    'string.max': 'Contact name cannot exceed 100 characters.',
  }),
  contactEmail: Joi.string().trim().email().max(150).required().messages({
    'string.email': 'A valid contact email is required.',
    'string.empty': 'Contact email is required.',
  }),
  proposedTerms: Joi.string().trim().min(5).max(2000).required().messages({
    'string.empty': 'Proposed terms are required.',
    'string.max': 'Proposed terms cannot exceed 2000 characters.',
  }),
  message: Joi.string().trim().min(10).max(3000).required().messages({
    'string.empty': 'Message to author is required.',
    'string.max': 'Message cannot exceed 3000 characters.',
  }),
  rights: Joi.array()
    .items(Joi.string().valid(...ALLOWED_RIGHTS))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one right must be selected.',
      'any.only': 'Invalid rights category specified.',
    }),
});

export const updatePublishRequestSchema = Joi.object({
  action: Joi.string()
    .valid('accept', 'decline', 'withdraw', 'close')
    .required()
    .messages({
      'any.only': 'Action must be accept, decline, withdraw, or close.',
      'any.required': 'Action is required.',
    }),
  note: Joi.string().trim().max(1000).allow('').optional(),
});

export const listPublishRequestsSchema = Joi.object({
  status: Joi.string()
    .valid(...PUBLISH_REQUEST_STATUSES_LIST, 'all')
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});
