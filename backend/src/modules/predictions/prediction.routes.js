const { Router } = require('express');
const controller = require('./prediction.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createGeneralLimiter } = require('../../middleware/rateLimit.middleware');
const { singlePredictSchema, batchPredictSchema, listPredictionsQuerySchema } = require('./prediction.validator');

const router = Router();
router.use(authenticate, createGeneralLimiter());

// NOTE: /export must come before /:containerId to avoid route conflict
router.get('/export', validate(listPredictionsQuerySchema, 'query'), controller.exportPredictions);
router.get('/', validate(listPredictionsQuerySchema, 'query'), controller.listPredictions);
router.get('/:containerId', controller.getPredictionByContainer);
router.post('/single', validate(singlePredictSchema), controller.predictSingle);
router.post('/batch', validate(batchPredictSchema), controller.predictBatch);
router.post('/re-score/:containerId', controller.reScoreContainer);

module.exports = router;
