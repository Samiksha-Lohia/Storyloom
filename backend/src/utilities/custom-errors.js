export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '', code = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (code) {
      this.code = code;
    }
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', code = null) {
    super(400, message, true, '', code);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', code = null) {
    super(401, message, true, '', code);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', code = null) {
    super(403, message, true, '', code);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not Found') {
    super(404, message);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict', code = null) {
    super(409, message, true, '', code);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error') {
    super(500, message, false);
  }
}
