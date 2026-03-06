const jwt = require('jsonwebtoken');
const envConfig = require('../config/env');
const { getRedisClient } = require('../config/redis');
const { unauthorized } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Verifies JWT access token.
 * Sets req.user = { userId, email, role } on success.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(res, 'Authorization header missing or malformed');
  }

  const token = authHeader.slice(7);

  try {
    // Check if token is blacklisted (logged out)
    const redis = getRedisClient();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return unauthorized(res, 'Token has been revoked');
    }

    const decoded = jwt.verify(token, envConfig.JWT_ACCESS_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Access token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Invalid access token');
    }
    logger.error('Auth middleware error', { error: err.message });
    return unauthorized(res, 'Authentication failed');
  }
}

/**
 * Role-based authorization. Call after authenticate().
 * @param {...string} roles - Allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res);
    }
    if (!roles.includes(req.user.role)) {
      const { forbidden } = require('../utils/response');
      return forbidden(res, `Role '${req.user.role}' is not permitted for this action`);
    }
    next();
  };
}

module.exports = { authenticate, authorize };
