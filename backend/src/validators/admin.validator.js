import Joi from 'joi';
import { USER_ROLES_LIST, USER_STATUSES_LIST } from '../constants/user-roles.js';
import { BOOK_STATUSES_LIST } from '../constants/book.js';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const adminPublisherQuerySchema = {
  query: Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected', 'all').default('pending'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const adminPublisherActionSchema = {
  params: Joi.object({
    id: Joi.string().regex(objectIdPattern).required(),
  }),
  body: Joi.object({
    action: Joi.string().valid('approve', 'reject').required(),
    reason: Joi.when('action', {
      is: 'reject',
      then: Joi.string().trim().min(3).max(1000).required(),
      otherwise: Joi.string().max(1000).allow('', null).optional(),
    }),
  }),
};

export const adminUsersQuerySchema = {
  query: Joi.object({
    search: Joi.string().trim().max(100).allow('', null).optional(),
    role: Joi.string().valid(...USER_ROLES_LIST, 'all').default('all'),
    status: Joi.string().valid(...USER_STATUSES_LIST, 'all').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('createdAt', 'booksCount', 'reportsCount', 'name').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

export const adminUserUpdateSchema = {
  params: Joi.object({
    id: Joi.string().regex(objectIdPattern).required(),
  }),
  body: Joi.object({
    role: Joi.string().valid(...USER_ROLES_LIST).optional(),
    status: Joi.string().valid(...USER_STATUSES_LIST).optional(),
    suspensionDays: Joi.number().integer().min(1).max(365).optional(),
    suspensionEndsAt: Joi.date().iso().allow(null).optional(),
    note: Joi.string().trim().max(1000).allow('', null).optional(),
  }).min(1),
};

export const adminBooksQuerySchema = {
  query: Joi.object({
    search: Joi.string().trim().max(100).allow('', null).optional(),
    genre: Joi.string().trim().max(50).allow('', null).optional(),
    status: Joi.string().valid(...BOOK_STATUSES_LIST, 'all').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('reads', 'rating', 'reports', 'createdAt', 'title').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

export const adminBookUpdateSchema = {
  params: Joi.object({
    id: Joi.string().regex(objectIdPattern).required(),
  }),
  body: Joi.object({
    action: Joi.string().valid('unpublish', 'suspend', 'restore', 'takedown').required(),
    reason: Joi.string().trim().min(3).max(1000).required(),
  }),
};

export default {
  adminPublisherQuerySchema,
  adminPublisherActionSchema,
  adminUsersQuerySchema,
  adminUserUpdateSchema,
  adminBooksQuerySchema,
  adminBookUpdateSchema,
};
