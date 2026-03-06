const userService = require('./user.service');
const { success, notFound } = require('../../utils/response');

async function listUsers(req, res) {
  const result = await userService.listUsers(req.query);
  return success(res, result);
}

async function getUserById(req, res) {
  const user = await userService.getUserById(req.params.id);
  if (!user) return notFound(res, 'User');
  return success(res, { user });
}

async function updateUser(req, res) {
  const user = await userService.updateUser(req.params.id, req.body);
  if (!user) return notFound(res, 'User');
  return success(res, { user });
}

module.exports = { listUsers, getUserById, updateUser };
