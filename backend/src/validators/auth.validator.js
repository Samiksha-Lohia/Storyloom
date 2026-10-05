import Joi from 'joi';
import { USER_ROLES } from '../constants/user-roles.js';

const registerSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80).required().messages({
      'string.empty': 'Name is required.',
      'string.min': 'Name must be at least 2 characters.',
      'string.max': 'Name cannot exceed 80 characters.',
      'any.required': 'Name is required.',
    }),
    email: Joi.string().trim().lowercase().email().required().messages({
      'string.empty': 'Email is required.',
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
      then: Joi.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Company name is required for publisher registration.',
        'string.min': 'Company name must be at least 2 characters.',
        'string.max': 'Company name cannot exceed 100 characters.',
        'any.required': 'Company name is required for publisher registration.',
      }),
      otherwise: Joi.string().trim().max(100).optional().allow('', null),
    }),
    website: Joi.when('role', {
      is: USER_ROLES.PUBLISHER,
      then: Joi.string().trim().uri({ scheme: [/https?/] }).required().messages({
        'string.empty': 'Website URL is required for publisher registration.',
        'any.required': 'Website URL is required for publisher registration.',
        'string.uri': 'Website must be a valid HTTP or HTTPS URL.',
      }),
      otherwise: Joi.string().trim().optional().allow('', null),
    }),
    note: Joi.string().trim().max(1000).optional().allow('', null),
    termsAccepted: Joi.boolean().valid(true).required().messages({
      'any.only': 'You must accept the Terms of Service and Privacy Policy.',
      'any.required': 'You must accept the Terms of Service and Privacy Policy.',
    }),
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

const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
  }),
};

const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required.',
    }),
    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Password must be at least 8 characters.',
      'any.required': 'Password is required.',
    }),
  }),
};

export { registerSchema, loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema };

