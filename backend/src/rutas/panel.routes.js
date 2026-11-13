const { Router } = require('express');
const ctrl = require('../controladores/panel.controller');
const { verifyToken, verifyRole, ROLES } = require('../middlewares/auth.middleware');
const { asyncHandler: h } = require('../middlewares/error.middleware');

const router = Router();
const { ADMIN, BODEGUERO, RESIDENTE } = ROLES;

// Solicitudes de material (Residente -> Bodega)
router.post('/solicitudes', verifyToken, verifyRole(RESIDENTE), h(ctrl.crearSolicitud));
router.get('/solicitudes', verifyToken, verifyRole(RESIDENTE, BODEGUERO), h(ctrl.listarSolicitudes));
router.patch('/solicitudes/:id/aprobar', verifyToken, verifyRole(BODEGUERO), h(ctrl.aprobarSolicitud));
router.patch('/solicitudes/:id/rechazar', verifyToken, verifyRole(BODEGUERO), h(ctrl.rechazarSolicitud));

// Inventario: punto de reorden
router.patch('/inventario/:materialId/minimo', verifyToken, verifyRole(BODEGUERO), h(ctrl.fijarStockMinimo));

// Admin
router.get('/mensajes', verifyToken, verifyRole(ADMIN), h(ctrl.listarMensajes));
router.patch('/mensajes/:id', verifyToken, verifyRole(ADMIN), h(ctrl.marcarMensaje));
router.get('/reportes/ventas', verifyToken, verifyRole(ADMIN), h(ctrl.reporteVentas));
router.get('/usuarios', verifyToken, verifyRole(ADMIN), h(ctrl.listarUsuarios));
router.patch('/usuarios/:id', verifyToken, verifyRole(ADMIN), h(ctrl.actualizarUsuario));

module.exports = router;
