/**
 * Rate limiting is DISABLED for development / demo purposes.
 * All limiter functions return a pass-through middleware (next() immediately).
 *
 * To re-enable in production, restore the express-rate-limit + RedisStore config
 * and set appropriate env vars (RATE_LIMIT_MAX, etc.).
 */

const passThrough = (_req, _res, next) => next();

function createGeneralLimiter() { return passThrough; }
function createAuthLimiter() { return passThrough; }
function createUploadLimiter() { return passThrough; }

module.exports = { createGeneralLimiter, createAuthLimiter, createUploadLimiter };
