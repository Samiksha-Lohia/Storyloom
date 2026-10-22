import Joi from 'joi';
import { STAGE_LIST } from '../constants/stages.js';

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

const askQuestionSchema = {
  body: Joi.object({
    question: Joi.string().min(1).max(1000).required().messages({
      'any.required': 'Question is required.',
      'string.min': 'Question must be at least 1 character.',
      'string.max': 'Question cannot exceed 1000 characters.',
    }),
    history: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant').required(),
        content: Joi.string().max(3000).allow('').required(),
        isError: Joi.boolean().optional(),
      }).unknown(true)
    ).optional(),
  }),
};

export {
  documentIdParamSchema,
  sceneIdParamSchema,
  characterIdParamSchema,
  stageParamSchema,
  askQuestionSchema,
};
