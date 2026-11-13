const { Router } = require('express');
const ctrl = require('../controladores/proyectos.controller');
const { verifyToken, verifyRole, ROLES } = require('../middlewares/auth.middleware');
const { asyncHandler: h } = require('../middlewares/error.middleware');

const router = Router();
const { ADMIN, BODEGUERO, RESIDENTE } = ROLES;

// Lectura: todos los roles autenticados (el bodeguero necesita proyectos para ENVIO_OBRA)
router.get('/proyectos', verifyToken, verifyRole(BODEGUERO, RESIDENTE), h(ctrl.listar));
router.get('/proyectos/:id', verifyToken, verifyRole(BODEGUERO, RESIDENTE), h(ctrl.detalle));

// Planeación: solo Admin
router.post('/proyectos', verifyToken, verifyRole(ADMIN), h(ctrl.crear));
router.patch('/proyectos/:id', verifyToken, verifyRole(ADMIN), h(ctrl.actualizar));
router.post('/proyectos/:id/fases', verifyToken, verifyRole(ADMIN), h(ctrl.crearFase));
router.post('/fases/:id/tareas', verifyToken, verifyRole(ADMIN), h(ctrl.crearTarea));
router.post('/tareas/:id/bom', verifyToken, verifyRole(ADMIN), h(ctrl.definirBom));

// Campo: Residente (y Admin)
router.patch('/fases/:id/avance', verifyToken, verifyRole(RESIDENTE), h(ctrl.actualizarAvance));
router.patch('/tareas/:id/estado', verifyToken, verifyRole(RESIDENTE), h(ctrl.actualizarEstadoTarea));

module.exports = router;
