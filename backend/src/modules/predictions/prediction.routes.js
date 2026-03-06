const { Router } = require('express');
const controller = require('./prediction.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createGeneralLimiter } = require('../../middleware/rateLimit.middleware');
const { singlePredictSchema, batchPredictSchema, listPredictionsQuerySchema, rawPredictSchema } = require('./prediction.validator');

const router = Router();
router.use(authenticate, createGeneralLimiter());

// NOTE: /export and /raw must come before /:containerId to avoid route conflicts
router.get('/export', validate(listPredictionsQuerySchema, 'query'), controller.exportPredictions);
router.get('/', validate(listPredictionsQuerySchema, 'query'), controller.listPredictions);
router.get('/:containerId', controller.getPredictionByContainer);
router.post('/single', authorize('ADMIN', 'ANALYST'), validate(singlePredictSchema), controller.predictSingle);
router.post('/batch', authorize('ADMIN', 'ANALYST'), validate(batchPredictSchema), controller.predictBatch);
router.post('/raw', authorize('ADMIN', 'ANALYST'), validate(rawPredictSchema), controller.predictRaw);
router.post('/re-score/:containerId', authorize('ADMIN', 'ANALYST'), controller.reScoreContainer);

module.exports = router;
