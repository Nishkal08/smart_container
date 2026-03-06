const analyticsService = require('./analytics.service');
const { success } = require('../../utils/response');

async function getSummary(req, res) {
  const data = await analyticsService.getSummary();
  return success(res, data);
}

async function getRiskDistribution(req, res) {
  const data = await analyticsService.getRiskDistribution();
  return success(res, data);
}

async function getTrends(req, res) {
  const data = await analyticsService.getTrends(req.query.period);
  return success(res, data);
}

async function getTopRiskyShippers(req, res) {
  const data = await analyticsService.getTopRiskyShippers({
    type: req.query.type || 'importer',
    limit: parseInt(req.query.limit || '10', 10),
  });
  return success(res, data);
}

async function getCountryRisk(req, res) {
  const data = await analyticsService.getCountryRisk();
  return success(res, data);
}

async function getValueWeightScatter(req, res) {
  const data = await analyticsService.getValueWeightScatter();
  return success(res, data);
}

async function getAnomalyFrequency(req, res) {
  const data = await analyticsService.getAnomalyFrequency();
  return success(res, data);
}

async function getTradeRoutes(req, res) {
  const data = await analyticsService.getTradeRoutes();
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
