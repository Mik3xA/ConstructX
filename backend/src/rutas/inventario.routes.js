const { Router } = require('express');
const ctrl = require('../controladores/inventario.controller');
const { verifyToken, verifyRole, ROLES } = require('../middlewares/auth.middleware');
const { asyncHandler: h } = require('../middlewares/error.middleware');

const router = Router();
const { ADMIN, BODEGUERO, RESIDENTE } = ROLES;

router.get('/materiales', verifyToken, verifyRole(BODEGUERO, RESIDENTE), h(ctrl.listarMateriales));
router.post('/materiales', verifyToken, verifyRole(ADMIN), h(ctrl.crearMaterial));

router.get('/inventario', verifyToken, verifyRole(BODEGUERO), h(ctrl.inventario));

router.get('/movimientos', verifyToken, verifyRole(BODEGUERO, RESIDENTE), h(ctrl.listarMovimientos));
// Permiso fino por tipo de movimiento dentro de movimientos.service.js
router.post('/movimientos', verifyToken, verifyRole(BODEGUERO, RESIDENTE), h(ctrl.registrarMovimiento));

module.exports = router;
