const { Router } = require('express');
const ctrl = require('../controladores/alertas.controller');
const { verifyToken, verifyRole, ROLES } = require('../middlewares/auth.middleware');
const { asyncHandler: h } = require('../middlewares/error.middleware');

const router = Router();

// Panel financiero y alertas: exclusivo del Admin.
// (Guardias por ruta: un router.use() aquí afectaría a otros routers montados en /api.)
const soloAdmin = [verifyToken, verifyRole(ROLES.ADMIN)];

router.get('/dashboard', soloAdmin, h(ctrl.dashboard));
router.get('/alertas', soloAdmin, h(ctrl.listar));
router.post('/alertas/auditar', soloAdmin, h(ctrl.auditar));
router.patch('/alertas/:id/revisar', soloAdmin, h(ctrl.revisar));

module.exports = router;
