const { Router } = require('express');
const ctrl = require('../controladores/public.controller');
const { asyncHandler: h } = require('../middlewares/error.middleware');

/** Rutas públicas de la tienda en línea (solo lectura + contacto). */
const router = Router();

router.get('/catalogo', h(ctrl.catalogo));
router.get('/catalogo/:sku', h(ctrl.producto));
router.get('/info', h(ctrl.info));

// Límite sencillo anti-spam en memoria: 5 mensajes por IP cada 10 minutos
const envios = new Map();
router.post(
  '/contacto',
  (req, res, next) => {
    const ahora = Date.now();
    const lista = (envios.get(req.ip) || []).filter((t) => ahora - t < 10 * 60 * 1000);
    if (lista.length >= 5) return res.status(429).json({ error: 'Demasiados mensajes. Intenta más tarde.' });
    lista.push(ahora);
    envios.set(req.ip, lista);
    return next();
  },
  h(ctrl.contacto)
);

module.exports = router;
