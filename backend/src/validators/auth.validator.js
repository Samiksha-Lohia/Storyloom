import Joi from 'joi';
import { USER_ROLES } from '../constants/user-roles.js';

const registerSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(80).required().messages({
      'string.min': 'Name must be at least 2 characters.',
      'string.max': 'Name cannot exceed 80 characters.',
      'any.required': 'Name is required.',
    }),
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Password must be at least 8 characters.',
      'any.required': 'Password is required.',
    }),
    role: Joi.string()
      .valid(USER_ROLES.READER, USER_ROLES.WRITER, USER_ROLES.PUBLISHER)
      .default(USER_ROLES.READER)
      .messages({
        'any.only': 'Role must be one of: reader, writer, publisher. Admin cannot be created via registration.',
      }),
    company: Joi.when('role', {
      is: USER_ROLES.PUBLISHER,
      then: Joi.string().min(2).max(100).required().messages({
        'any.required': 'Company name is required for publisher registration.',
      }),
      otherwise: Joi.string().optional().allow('', null),
    }),
    website: Joi.when('role', {
      is: USER_ROLES.PUBLISHER,
      then: Joi.string().uri({ scheme: [/https?/] }).required().messages({
        'any.required': 'Website URL is required for publisher registration.',
        'string.uri': 'Website must be a valid HTTP or HTTPS URL.',
      }),
      otherwise: Joi.string().optional().allow('', null),
    }),
    note: Joi.string().max(1000).optional().allow('', null),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),
};

const refreshSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required.',
    }),
  }),
};

export { registerSchema, loginSchema, refreshSchema };
