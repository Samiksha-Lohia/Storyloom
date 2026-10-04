import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createReviewSchema = {
  params: Joi.object({
    bookId: Joi.string().regex(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid Book ID format.',
      'any.required': 'Book ID is required.',
    }),
  }),
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'number.base': 'Rating must be a number.',
      'number.min': 'Rating must be at least 1 star.',
      'number.max': 'Rating cannot exceed 5 stars.',
      'any.required': 'Rating is required.',
    }),
    text: Joi.string().max(5000).allow('').optional(),
  }),
};

export const updateReviewSchema = {
  params: Joi.object({
    bookId: Joi.string().regex(objectIdPattern).required(),
    reviewId: Joi.string().regex(objectIdPattern).required(),
  }),
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    text: Joi.string().max(5000).allow('').optional(),
  }),
};

export const reviewIdParamSchema = {
  params: Joi.object({
    bookId: Joi.string().regex(objectIdPattern).required(),
    reviewId: Joi.string().regex(objectIdPattern).required(),
  }),
};

export const queryReviewSchema = {
  params: Joi.object({
    bookId: Joi.string().regex(objectIdPattern).required(),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    sort: Joi.string().valid('newest', 'highest', 'lowest').default('newest'),
  }),
};
