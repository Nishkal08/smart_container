const analyticsService = require('./analytics.service');
const { success } = require('../../utils/response');

function userCtx(req) {
  return { userId: req.user.userId, isAdmin: req.user.role === 'ADMIN' };
}

async function getSummary(req, res) {
  const data = await analyticsService.getSummary(userCtx(req));
  return success(res, data);
}

async function getRiskDistribution(req, res) {
  const data = await analyticsService.getRiskDistribution(userCtx(req));
  return success(res, data);
}

async function getTrends(req, res) {
  const data = await analyticsService.getTrends({ period: req.query.period, ...userCtx(req) });
  return success(res, data);
}

async function getTopRiskyShippers(req, res) {
  const data = await analyticsService.getTopRiskyShippers({
    type: req.query.type || 'importer',
    limit: parseInt(req.query.limit || '10', 10),
    ...userCtx(req),
  });
  return success(res, data);
}

async function getCountryRisk(req, res) {
  const data = await analyticsService.getCountryRisk(userCtx(req));
  return success(res, data);
}

async function getValueWeightScatter(req, res) {
  const data = await analyticsService.getValueWeightScatter(userCtx(req));
  return success(res, data);
}

async function getAnomalyFrequency(req, res) {
  const data = await analyticsService.getAnomalyFrequency(userCtx(req));
  return success(res, data);
}

async function getTradeRoutes(req, res) {
  const data = await analyticsService.getTradeRoutes(userCtx(req));
  return success(res, data);
}

module.exports = { 
  getSummary, 
  getRiskDistribution, 
  getTrends, 
  getTopRiskyShippers, 
  getCountryRisk,
  getValueWeightScatter,
  getAnomalyFrequency,
  getTradeRoutes
};
