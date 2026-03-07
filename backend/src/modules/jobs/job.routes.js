const { Router } = require('express');
const controller = require('./job.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { createGeneralLimiter } = require('../../middleware/rateLimit.middleware');

const router = Router();
router.use(authenticate, createGeneralLimiter());

router.get('/', controller.listJobs);
router.get('/:id', controller.getJob);
router.get('/:id/results', controller.getJobResults);
router.post('/:id/retry', controller.retryJob);
router.delete('/:id/permanent', authorize('ADMIN'), controller.deleteJob);
router.delete('/:id', authorize('ADMIN', 'ANALYST'), controller.cancelJob);

module.exports = router;
