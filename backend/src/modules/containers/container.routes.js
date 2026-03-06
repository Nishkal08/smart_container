const { Router } = require('express');
const controller = require('./container.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createGeneralLimiter, createUploadLimiter } = require('../../middleware/rateLimit.middleware');
const { containerBodySchema, containerQuerySchema, updateContainerSchema } = require('./container.validator');

const router = Router();
const generalLimiter = createGeneralLimiter();

router.use(authenticate);
router.use(generalLimiter);

router.get('/', validate(containerQuerySchema, 'query'), controller.listContainers);
router.get('/:id', controller.getContainerById);
router.post('/', authorize('ADMIN', 'ANALYST'), validate(containerBodySchema), controller.createContainer);
router.post('/upload', authorize('ADMIN', 'ANALYST'), createUploadLimiter(), controller.uploadCSV);
router.put('/:id', authorize('ADMIN', 'ANALYST'), validate(updateContainerSchema), controller.updateContainer);
router.delete('/:id', authorize('ADMIN'), controller.deleteContainer);

module.exports = router;
