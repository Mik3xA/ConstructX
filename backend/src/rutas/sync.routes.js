const { Router } = require('express');
const ctrl = require('../controladores/sync.controller');
const { verifyToken, verifyRole, ROLES } = require('../middlewares/auth.middleware');
const { asyncHandler: h } = require('../middlewares/error.middleware');

const router = Router();

router.post('/sync', verifyToken, verifyRole(ROLES.BODEGUERO, ROLES.RESIDENTE), h(ctrl.sync));

module.exports = router;
