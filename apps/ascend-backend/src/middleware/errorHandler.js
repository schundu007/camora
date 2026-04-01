/**
 * Error handler middleware - standardized error responses
 */

import { logger } from './requestLogger.js';

// Error codes
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
};

// HTTP status codes for each error code
const statusCodes = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.UPLOAD_ERROR]: 400,
};

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(message, code = ErrorCode.INTERNAL_ERROR, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCodes[code] || 500;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // Default values
  let statusCode = 500;
  let errorCode = ErrorCode.INTERNAL_ERROR;
  let message = 'Internal server error';
  let details = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    // Joi validation error
    statusCode = 400;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = 'Validation failed';
    details = err.details?.map(d => d.message).join(', ') || err.message;
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    errorCode = ErrorCode.UPLOAD_ERROR;
    message = 'File too large';
  } else {
    // Generic error
    details = err.message;
  }

  // Log the error
  logger.error({
    requestId: req.requestId,
    error: {
      code: errorCode,
      message,
      details,
      stack: err.stack,
    },
  }, 'Error occurred');

  // Send standardized error response
  res.status(statusCode).json({
    error: message,
    code: errorCode,
    details,
    requestId: req.requestId,
  });
}

export default errorHandler;
