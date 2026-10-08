import mongoose from 'mongoose';
import config from '../config/env.js';
import logger from '../utilities/logger.js';
import { ApiError, NotFoundError } from '../utilities/custom-errors.js';

const notFoundHandler = (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = config.file.maxSizeBytes / (1024 * 1024);
      message = `File too large. Maximum allowed size is ${maxMb}MB.`;
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join('; ');
  }

  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for field '${err.path}': ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate value for '${field}'. Please use a different value.`;
  }

  if (!(err instanceof ApiError) || !err.isOperational) {
    logger.error(`[UNHANDLED ERROR] ${err.stack || err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.errors && { errors: err.errors }),
    ...(err.code && { code: err.code }),
    ...(config.env === 'development' && { stack: err.stack }),
  });
};

export { notFoundHandler, errorHandler };
