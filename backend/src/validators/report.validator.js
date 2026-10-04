import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createReportSchema = {
  body: Joi.object({
    targetType: Joi.string().valid('book', 'review', 'user').required(),
    targetId: Joi.string().regex(objectIdPattern).required(),
    reason: Joi.string().valid('copyright', 'plagiarism', 'abuse', 'spam', 'other').required(),
    details: Joi.string().max(3000).allow('').optional(),
    claimantName: Joi.string().max(200).allow('', null).optional(),
    claimantContact: Joi.string().max(200).allow('', null).optional(),
  }),
};

export const publicNoticeSchema = {
  body: Joi.object({
    targetType: Joi.string().valid('book', 'review', 'user').default('book'),
    targetId: Joi.string().regex(objectIdPattern).required(),
    reason: Joi.string().valid('copyright', 'plagiarism', 'abuse', 'spam', 'other').default('copyright'),
    details: Joi.string().max(3000).required(),
    claimantName: Joi.string().max(200).required(),
    claimantContact: Joi.string().max(200).required(),
    honeypot: Joi.string().allow('', null).optional(),
  }),
};

export const adminReportActionSchema = {
  params: Joi.object({
    id: Joi.string().regex(objectIdPattern).required(),
  }),
  body: Joi.object({
    action: Joi.string().valid('dismiss', 'unpublish_book', 'remove_review', 'strike_user').required(),
    notes: Joi.string().max(2000).allow('').optional(),
  }),
};
