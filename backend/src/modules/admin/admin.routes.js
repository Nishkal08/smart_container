const { Router } = require('express');
const controller = require('./admin.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { createGeneralLimiter } = require('../../middleware/rateLimit.middleware');

const router = Router();
router.use(authenticate, authorize('ADMIN'), createGeneralLimiter());

router.get('/stats', controller.getStats);
router.post('/flush-cache', controller.flushCache);

module.exports = router;
