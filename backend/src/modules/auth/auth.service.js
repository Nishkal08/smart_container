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

async function forgotPassword({ email }) {
  const crypto = require('crypto');
  const redis = getRedisClient();

  // Generic message prevents email enumeration
  const message = 'If that email is registered, you will receive a password reset link shortly.';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.is_active) return { message };

  // Generate cryptographically secure token
  const token = crypto.randomBytes(32).toString('hex');
  await redis.set(`pwd_reset:${token}`, user.id, 'EX', 3600); // expires in 1 hour

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  logger.info('Password reset token generated', { userId: user.id });

  // In production: send resetUrl via email (SMTP not configured)
  // In development: return the URL in the response so it can be used directly
  const isDev = process.env.NODE_ENV !== 'production';
  return { message, ...(isDev ? { reset_url: resetUrl, dev_note: 'In production this URL is sent via email.' } : {}) };
}

async function resetPassword({ token, password }) {
  const redis = getRedisClient();

  const userId = await redis.get(`pwd_reset:${token}`);
  if (!userId) {
    const err = new Error('Invalid or expired reset token');
    err.statusCode = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password_hash } });
  await redis.del(`pwd_reset:${token}`);

  logger.info('Password reset successfully', { userId });
  return { message: 'Password has been reset. You can now sign in with your new password.' };
}

async function googleAuth({ access_token }) {
  // Verify token and fetch user profile from Google
  let googleUser;
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) throw new Error('token_invalid');
    googleUser = await res.json();
  } catch {
    const err = new Error('Invalid or expired Google token');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const { sub: google_id, email, name } = googleUser;
  if (!google_id || !email) {
    const err = new Error('Google did not return required user information');
    err.statusCode = 400;
    err.code = 'BAD_REQUEST';
    throw err;
  }

  // Find by google_id first, then fall back to email (links existing accounts)
  let user = await prisma.user.findUnique({ where: { google_id } });

  if (!user) {
    user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Link the Google ID to the existing account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { google_id },
      });
    } else {
      // New user — create with ANALYST role and a non-usable password hash
      const crypto = require('crypto');
      const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

      user = await prisma.user.create({
        data: {
          email,
          name: name ?? email.split('@')[0],
          google_id,
          password_hash: randomHash,
          role: 'ANALYST',
        },
      });
      logger.info('New user via Google OAuth', { userId: user.id, email: user.email });
    }
  }

  if (!user.is_active) {
    const err = new Error('Account is deactivated');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  logger.info('User signed in via Google', { userId: user.id, email: user.email });

  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

module.exports = { register, login, googleAuth, refresh, logout, changePassword, forgotPassword, resetPassword };
