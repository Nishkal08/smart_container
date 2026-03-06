const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');
const envConfig = require('../config/env');

/**
 * General API rate limiter.
 * Uses Redis store so it works correctly across multiple Node.js instances.
 */
function createGeneralLimiter() {
  return rateLimit({
    windowMs: envConfig.RATE_LIMIT_WINDOW_MS,
    max: envConfig.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => getRedisClient().call(...args),
    }),
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
    },
  });
}

/**
 * Auth-specific rate limiter (stricter).
 */
function createAuthLimiter() {
  return rateLimit({
    windowMs: envConfig.RATE_LIMIT_WINDOW_MS,
    max: envConfig.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => getRedisClient().call(...args),
    }),
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please wait 15 minutes.' },
    },
  });
}

/**
 * Upload rate limiter: 5 uploads per hour per user/IP.
 */
function createUploadLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => getRedisClient().call(...args),
    }),
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Upload limit reached. Maximum 5 uploads per hour.' },
    },
  });
}

module.exports = { createGeneralLimiter, createAuthLimiter, createUploadLimiter };
