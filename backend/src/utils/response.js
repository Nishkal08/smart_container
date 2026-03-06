/**
 * Standard API response helpers.
 * All responses follow: { success, data } or { success, error }
 */

function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function created(res, data) {
  return success(res, data, 201);
}

function accepted(res, data) {
  return success(res, data, 202);
}

function noContent(res) {
  return res.status(204).send();
}

function error(res, message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
  const body = { success: false, error: { code, message } };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

function validationError(res, details, message = 'Validation failed') {
  return error(res, message, 400, 'VALIDATION_ERROR', details);
}

function notFound(res, resource = 'Resource') {
  return error(res, `${resource} not found`, 404, 'NOT_FOUND');
}

function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401, 'UNAUTHORIZED');
}

function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403, 'FORBIDDEN');
}

function conflict(res, message = 'Resource already exists') {
  return error(res, message, 409, 'CONFLICT');
}

module.exports = { success, created, accepted, noContent, error, validationError, notFound, unauthorized, forbidden, conflict };
