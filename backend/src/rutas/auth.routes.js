const { Router } = require('express');
const ctrl = require('../controladores/auth.controller');
const { verifyToken, verifyRole, ROLES } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

const router = Router();

// Rutas públicas: login y alta de clientes del portal
router.post('/login', asyncHandler(ctrl.login));
router.post('/registro', asyncHandler(ctrl.registroCliente));

router.get('/me', verifyToken, asyncHandler(ctrl.me));
router.patch('/me', verifyToken, asyncHandler(ctrl.actualizarPerfil));
router.post('/register', verifyToken, verifyRole(ROLES.ADMIN), asyncHandler(ctrl.register));
router.get('/users', verifyToken, verifyRole(ROLES.ADMIN), asyncHandler(ctrl.listUsers));

module.exports = router;
