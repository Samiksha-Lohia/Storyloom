import Joi from 'joi';
import { BOOK_STATUSES_LIST, BOOK_TEMPLATES_LIST, BOOK_ACCENTS } from '../constants/book.js';

export const createBookSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(200).required().messages({
      'any.required': 'Book title is required.',
      'string.empty': 'Book title cannot be empty.',
    }),
    blurb: Joi.string().max(5000).optional().allow(''),
    genre: Joi.string().max(50).default('General'),
    tags: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().trim().max(30)),
        Joi.string().allow('')
      )
      .default([]),
    language: Joi.string().default('en'),
    mature: Joi.alternatives()
      .try(Joi.boolean(), Joi.string().valid('true', 'false'))
      .default(false),
    template: Joi.string()
      .valid(...BOOK_TEMPLATES_LIST)
      .default('classic'),
    accent: Joi.string()
      .valid(...BOOK_ACCENTS)
      .default(BOOK_ACCENTS[0]),
    status: Joi.string()
      .valid(...BOOK_STATUSES_LIST)
      .default('published'),
    acceptedRights: Joi.alternatives()
      .try(
        Joi.boolean().valid(true),
        Joi.string().valid('true')
      )
      .required()
      .messages({
        'any.only': 'You must accept the rights and ownership agreement to publish.',
        'any.required': 'Rights acceptance is required.',
      }),
  }),
};

export const updateBookSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    blurb: Joi.string().max(5000).optional().allow(''),
    genre: Joi.string().max(50).optional(),
    tags: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().trim().max(30)),
        Joi.string().allow('')
      )
      .optional(),
    language: Joi.string().optional(),
    mature: Joi.alternatives()
      .try(Joi.boolean(), Joi.string().valid('true', 'false'))
      .optional(),
    template: Joi.string().valid(...BOOK_TEMPLATES_LIST).optional(),
    accent: Joi.string().valid(...BOOK_ACCENTS).optional(),
    status: Joi.string().valid(...BOOK_STATUSES_LIST).optional(),
  }),
};

export const bookIdParamSchema = {
  params: Joi.object({
    bookId: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Invalid book ID format.',
      'string.length': 'Invalid book ID format.',
      'any.required': 'Book ID is required.',
    }),
  }),
};

export const queryCatalogueSchema = {
  query: Joi.object({
    genre: Joi.string().optional().allow(''),
    tag: Joi.string().optional().allow(''),
    minRating: Joi.number().min(0).max(5).optional(),
    completionMin: Joi.number().min(0).max(100).optional(),
    lengthBucket: Joi.string().valid('short', 'medium', 'long').optional(),
    length: Joi.string().valid('short', 'medium', 'long').optional(),
    wishlisted: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
    mature: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
    search: Joi.string().optional().allow(''),
    sort: Joi.string()
      .valid(
        'trending',
        'new',
        'rating',
        '-stats.readCount',
        '-stats.reads',
        'reads',
        '-stats.rating',
        '-stats.ratingAvg',
        '-createdAt',
        'title',
        'completion'
      )
      .default('new'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const getPagesQuerySchema = {
  params: Joi.object({
    bookId: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Invalid book ID format.',
      'string.length': 'Invalid book ID format.',
      'any.required': 'Book ID is required.',
    }),
  }),
  query: Joi.object({
    from: Joi.number().integer().min(1).default(1),
    to: Joi.number().integer().min(1).optional(),
  }),
};

export default {
  createBookSchema,
  updateBookSchema,
  bookIdParamSchema,
  queryCatalogueSchema,
};
