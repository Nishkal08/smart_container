const logger = require('../utils/logger');
const { error, notFound: notFoundResponse } = require('../utils/response');

/**
 * 404 handler — placed after all routes.
 */
function notFoundHandler(req, res) {
  return notFoundResponse(res, `Route ${req.method} ${req.originalUrl}`);
}

/**
 * Global error handler — placed last.
 * Handles errors thrown in route handlers (including async errors via express-async-errors).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log the full error
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.userId,
  });

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, `File too large. Maximum size is ${process.env.UPLOAD_MAX_SIZE_MB || 10}MB`, 413, 'FILE_TOO_LARGE');
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return error(res, 'A record with this identifier already exists', 409, 'CONFLICT');
  }
  if (err.code === 'P2025') {
    return error(res, 'Record not found', 404, 'NOT_FOUND');
  }

  // Custom service errors with statusCode
  if (err.statusCode && err.code) {
    return error(res, err.message, err.statusCode, err.code);
  }

  // JWT errors (should be caught by auth middleware, but as fallback)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return error(res, 'Invalid or expired token', 401, 'UNAUTHORIZED');
  }

  // Zod errors (should be caught by validate middleware, but as fallback)
  if (err.name === 'ZodError') {
    const details = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return error(res, 'Validation failed', 400, 'VALIDATION_ERROR', details);
  }

  // SyntaxError (malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400) {
    return error(res, 'Invalid JSON in request body', 400, 'BAD_REQUEST');
  }

  // Generic fallback
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  return error(res, message, statusCode, 'INTERNAL_ERROR');
}

module.exports = { notFoundHandler, errorHandler };
