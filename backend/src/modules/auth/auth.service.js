const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const { getRedisClient } = require('../../config/redis');
const envConfig = require('../../config/env');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = 12;

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    envConfig.JWT_ACCESS_SECRET,
    { expiresIn: envConfig.JWT_ACCESS_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    envConfig.JWT_REFRESH_SECRET,
    { expiresIn: envConfig.JWT_REFRESH_EXPIRY }
  );
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

async function register({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    err.code = 'CONFLICT';
    throw err;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, password_hash, role },
  });

  logger.info('New user registered', { userId: user.id, email: user.email, role: user.role });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Constant-time comparison to prevent timing attacks
  const validPassword = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, '$2b$12$invalidhashfortimingnormalizati'); // dummy hash

  if (!user || !validPassword) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Account is deactivated');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  logger.info('User logged in', { userId: user.id, email: user.email });

  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

async function refresh({ refreshToken }) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, envConfig.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || !user.is_active) {
    const err = new Error('User not found or deactivated');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  return { accessToken: generateAccessToken(user) };
}

async function logout(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        const redis = getRedisClient();
        await redis.set(`blacklist:${token}`, '1', 'EX', ttl);
      }
    }
  } catch (err) {
    logger.warn('Logout blacklist failed', { error: err.message });
  }
}

async function changePassword(userId, { current_password, new_password }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const isMatch = await bcrypt.compare(current_password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    err.code = 'INVALID_PASSWORD';
    throw err;
  }

  const password_hash = await bcrypt.hash(new_password, 12);
  await prisma.user.update({ where: { id: userId }, data: { password_hash } });
}

module.exports = { register, login, refresh, logout, changePassword };
