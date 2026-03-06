const adminService = require('./admin.service');
const { success } = require('../../utils/response');

async function getStats(req, res) {
  const stats = await adminService.getStats();
  return success(res, { stats });
}

async function flushCache(req, res) {
  const result = await adminService.flushRateLimitCache();
  return success(res, result);
}

module.exports = { getStats, flushCache };
