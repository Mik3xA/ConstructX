const { Router } = require('express');
const ctrl = require('../controladores/pedidos.controller');
const catalogo = require('../controladores/catalogo.controller');
const { verifyToken, verifyRole, ROLES } = require('../middlewares/auth.middleware');
const { asyncHandler: h } = require('../middlewares/error.middleware');

const router = Router();
const { ADMIN, BODEGUERO, RESIDENTE, CLIENTE } = ROLES;

// Catálogo visual: todos los roles autenticados
router.get('/catalogo', verifyToken, verifyRole(CLIENTE, BODEGUERO, RESIDENTE), h(catalogo.listar));
router.patch('/materiales/:id', verifyToken, verifyRole(ADMIN), h(catalogo.actualizar));

// Pedidos de flete
router.post('/pedidos/cotizar', verifyToken, verifyRole(CLIENTE), h(ctrl.cotizar));
router.post('/pedidos', verifyToken, verifyRole(CLIENTE), h(ctrl.crear));
router.get('/pedidos', verifyToken, verifyRole(CLIENTE, BODEGUERO), h(ctrl.listar));
router.get('/pedidos/:uuid', verifyToken, verifyRole(CLIENTE, BODEGUERO), h(ctrl.obtener));
router.get('/pedidos/:uuid/recibo', verifyToken, verifyRole(CLIENTE, BODEGUERO), h(ctrl.recibo));
router.patch('/pedidos/:uuid/estado', verifyToken, verifyRole(BODEGUERO), h(ctrl.cambiarEstado));

module.exports = router;
