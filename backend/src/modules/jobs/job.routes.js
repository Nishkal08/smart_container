const { Router } = require('express');
const controller = require('./job.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { createGeneralLimiter } = require('../../middleware/rateLimit.middleware');

const router = Router();
router.use(authenticate, createGeneralLimiter());

router.get('/', controller.listJobs);
router.get('/:id', controller.getJob);
router.get('/:id/results', controller.getJobResults);
router.delete('/:id', controller.cancelJob);

module.exports = router;
