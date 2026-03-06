const { Router } = require('express');
const controller = require('./auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { createAuthLimiter } = require('../../middleware/rateLimit.middleware');
const { registerSchema, loginSchema, refreshSchema, changePasswordSchema } = require('./auth.validator');

const router = Router();
const authLimiter = createAuthLimiter();

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', authLimiter, validate(refreshSchema), controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/change-password', authenticate, validate(changePasswordSchema), controller.changePassword);

module.exports = router;
