const { Router } = require('express');
const controller = require('./user.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createGeneralLimiter } = require('../../middleware/rateLimit.middleware');
const { listUsersQuerySchema, updateUserSchema } = require('./user.validator');

const router = Router();
router.use(authenticate, authorize('ADMIN'), createGeneralLimiter());

router.get('/', validate(listUsersQuerySchema, 'query'), controller.listUsers);
router.get('/:id', controller.getUserById);
router.patch('/:id', validate(updateUserSchema), controller.updateUser);

module.exports = router;
