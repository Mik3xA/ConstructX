const { Router } = require('express');
const ctrl = require('../controladores/auth.controller');
const { verifyToken, verifyRole, ROLES } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

const router = Router();

// Única ruta pública del sistema
router.post('/login', asyncHandler(ctrl.login));

router.get('/me', verifyToken, asyncHandler(ctrl.me));
router.post('/register', verifyToken, verifyRole(ROLES.ADMIN), asyncHandler(ctrl.register));
router.get('/users', verifyToken, verifyRole(ROLES.ADMIN), asyncHandler(ctrl.listUsers));

module.exports = router;
