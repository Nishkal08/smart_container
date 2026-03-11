const authService = require('./auth.service');
const { created, success, unauthorized } = require('../../utils/response');

async function register(req, res) {
  const result = await authService.register(req.body);
  return created(res, result);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  return success(res, result);
}

async function refresh(req, res) {
  const result = await authService.refresh(req.body);
  return success(res, result);
}

async function logout(req, res) {
  await authService.logout(req.token);
  return success(res, null);
}

async function me(req, res) {
  const { userId } = req.user;
  const prisma = require('../../config/db');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, created_at: true },
  });
  if (!user) return unauthorized(res, 'User not found');
  return success(res, { user });
}

async function changePassword(req, res) {
  await authService.changePassword(req.user.userId, req.body);
  return success(res, { message: 'Password changed successfully' });
}

async function forgotPassword(req, res) {
  const result = await authService.forgotPassword(req.body);
  return success(res, result);
}

async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body);
  return success(res, result);
}

async function googleAuth(req, res) {
  const result = await authService.googleAuth(req.body);
  return success(res, result);
}

module.exports = { register, login, googleAuth, refresh, logout, me, changePassword, forgotPassword, resetPassword };
