import Joi from 'joi';
import { STAGE_LIST } from '../constants/stages.js';
import { CONTINUITY_STATUS_LIST } from '../constants/index.js';

const objectIdPattern = /^[a-f\d]{24}$/i;

const documentIdParamSchema = {
  params: Joi.object({
    documentId: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'documentId must be a valid MongoDB ObjectId.',
    }),
  }),
};

const sceneIdParamSchema = {
  params: Joi.object({
    documentId: Joi.string().pattern(objectIdPattern).required(),
    sceneId: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'sceneId must be a valid MongoDB ObjectId.',
    }),
  }),
};

const characterIdParamSchema = {
  params: Joi.object({
    documentId: Joi.string().pattern(objectIdPattern).required(),
    characterId: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'characterId must be a valid MongoDB ObjectId.',
    }),
  }),
};

const stageParamSchema = {
  params: Joi.object({
    documentId: Joi.string().pattern(objectIdPattern).required(),
    stage: Joi.string()
      .valid(...STAGE_LIST)
      .required()
      .messages({
        'any.only': `stage must be one of: ${STAGE_LIST.join(', ')}.`,
      }),
  }),
};

const searchQuerySchema = {
  query: Joi.object({
    q: Joi.string().min(1).max(200).required().messages({
      'any.required': 'Search query parameter "q" is required.',
    }),
    character: Joi.string().optional(),
    sceneRange: Joi.object({
      from: Joi.number().integer().min(1).optional(),
      to: Joi.number().integer().min(1).optional(),
    }).optional(),
    sceneRangeFrom: Joi.number().integer().min(1).optional(),
    sceneRangeTo: Joi.number().integer().min(1).optional(),
    mood: Joi.string().optional(),
  }),
};

const updateDocumentBodySchema = {
  body: Joi.object({
    title: Joi.string().trim().min(1).max(200).required().messages({
      'string.min':   'title must be at least 1 character.',
      'string.max':   'title must be at most 200 characters.',
      'any.required': 'title is required.',
    }),
  }),
};

const continuityIssueIdParamSchema = {
  params: Joi.object({
    documentId: Joi.string().pattern(objectIdPattern).required(),
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'id must be a valid MongoDB ObjectId.',
    }),
  }),
};

const updateContinuityStatusSchema = {
  body: Joi.object({
    status: Joi.string()
      .valid(...CONTINUITY_STATUS_LIST)
      .required()
      .messages({
        'any.only':     `status must be one of: ${CONTINUITY_STATUS_LIST.join(', ')}.`,
        'any.required': 'status is required.',
      }),
  }),
};

const askQuestionSchema = {
  body: Joi.object({
    question: Joi.string().min(1).max(1000).required().messages({
      'any.required': 'Question is required.',
      'string.min': 'Question must be at least 1 character.',
      'string.max': 'Question cannot exceed 1000 characters.',
    }),
  }),
};

export {
  documentIdParamSchema,
  sceneIdParamSchema,
  characterIdParamSchema,
  stageParamSchema,
  searchQuerySchema,
  updateDocumentBodySchema,
  continuityIssueIdParamSchema,
  updateContinuityStatusSchema,
  askQuestionSchema,
};
