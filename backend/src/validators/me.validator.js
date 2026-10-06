import Joi from 'joi';

export const readerSettingsSchema = {
  body: Joi.object({
    fontSize: Joi.number().min(12).max(32).optional(),
    lineHeight: Joi.number().min(1.2).max(2.5).optional(),
    fontFamily: Joi.string().valid('serif', 'sans').optional(),
    theme: Joi.string().valid('light', 'sepia', 'dark').optional(),
  }).min(1),
};

export const updateLibrarySchema = {
  body: Joi.object({
    status: Joi.string().valid('reading', 'want_to_read', 'finished', 'dropped').optional(),
    currentPage: Joi.number().integer().min(1).optional(),
    currentOffset: Joi.number().integer().min(0).optional(),
    addBookmark: Joi.object({
      offset: Joi.number().integer().min(0).required(),
    }).optional(),
    removeBookmark: Joi.object({
      offset: Joi.number().integer().min(0).required(),
    }).optional(),
  }).min(1),
};

export const libraryQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('reading', 'want_to_read', 'finished', 'dropped', 'unfinished').optional(),
  }),
};

export const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    bio: Joi.string().max(1000).optional().allow(''),
    defaultTemplate: Joi.string().valid('classic', 'showcase', 'notebook').optional(),
  }).min(1),
};

