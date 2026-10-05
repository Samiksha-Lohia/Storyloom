import { BadRequestError } from '../utilities/custom-errors.js';

/**
 * Factory that returns an Express middleware validating req against a Joi schema.
 *
 * @param {Object} schema - Object with optional keys: body, params, query
 *                          each holding a Joi schema.
 * @returns Express middleware
 */
const validate = (schema) => (req, _res, next) => {
  const parts = ['body', 'params', 'query'];
  const fieldErrors = [];
  const errorMessages = [];

  for (const part of parts) {
    if (!schema[part]) continue;
    const { error, value } = schema[part].validate(req[part], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      error.details.forEach((d) => {
        fieldErrors.push({
          field: d.path.join('.'),
          message: d.message,
        });
        errorMessages.push(d.message);
      });
    } else {
      req[part] = value; // replace with sanitised/defaulted values
    }
  }

  if (fieldErrors.length > 0) {
    const err = new BadRequestError(errorMessages.join('; '));
    err.errors = fieldErrors;
    return next(err);
  }

  next();
};

export { validate };
