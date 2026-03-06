const { Router } = require('express');
const controller = require('./analytics.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { createGeneralLimiter } = require('../../middleware/rateLimit.middleware');

const router = Router();
router.use(authenticate, createGeneralLimiter());

router.get('/summary', controller.getSummary);
router.get('/risk-distribution', controller.getRiskDistribution);
router.get('/trends', controller.getTrends);
router.get('/top-risky-shippers', controller.getTopRiskyShippers);
router.get('/country-risk', controller.getCountryRisk);
router.get('/value-weight-scatter', controller.getValueWeightScatter);
router.get('/anomaly-frequency', controller.getAnomalyFrequency);
router.get('/trade-routes', controller.getTradeRoutes);

module.exports = router;
