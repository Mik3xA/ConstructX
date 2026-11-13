/**
 * Endpoints PÚBLICOS de la tienda (sin sesión): catálogo, detalle de producto,
 * datos de la empresa y formulario de contacto. Nunca exponen datos internos.
 */
const MaterialModel = require('../modelos/material.model');
const MensajeModel = require('../modelos/mensaje.model');
const socketService = require('../servicios/socket.service');
const { db } = require('../config/database');
const env = require('../config/env');
const { HttpError } = require('../middlewares/error.middleware');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Para el público mostramos disponibilidad, no la cifra exacta del almacén. */
function disponibilidad(stock) {
  if (stock <= 0) return 'AGOTADO';
  if (stock < 50) return 'POCAS';
  return 'DISPONIBLE';
}

const publico = (m) => {
  const { stock_disponible, ...resto } = m;
  return { ...resto, disponibilidad: disponibilidad(stock_disponible) };
};

module.exports = {
  /** GET /api/public/catalogo?categoria=&q= */
  catalogo(req, res) {
    const { categoria, q } = req.query;
    res.json({
      categorias: MaterialModel.categorias(),
      materiales: MaterialModel.catalogo({ categoria, q: q ? String(q).slice(0, 80) : undefined }).map(publico),
    });
  },

  /** GET /api/public/catalogo/:sku  -> producto + relacionados de la misma categoría */
  producto(req, res) {
    const todos = MaterialModel.catalogo();
    const m = todos.find((x) => x.codigo_sku === req.params.sku);
    if (!m) throw new HttpError(404, 'Producto no encontrado');
    res.json({
      producto: publico(m),
      relacionados: todos.filter((x) => x.categoria === m.categoria && x.id !== m.id).slice(0, 4).map(publico),
    });
  },

  /** GET /api/public/info  -> tarifas y cifras de confianza para la página */
  info(req, res) {
    const cifras = db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM pedidos_fletes WHERE estado = 'ENTREGADO') AS fletes_entregados,
                (SELECT COUNT(*) FROM users WHERE rol = 'cliente') AS clientes,
                (SELECT COUNT(*) FROM catalogo_materiales WHERE activo = 1) AS productos`
      )
      .get();
    res.json({
      tarifa_flete: { base: env.FLETE_BASE, porcentaje: env.FLETE_PORCENTAJE, gratis_desde: env.FLETE_GRATIS_DESDE },
      cifras,
    });
  },

  /** POST /api/public/contacto */
  contacto(req, res) {
    const { nombre, email, telefono, asunto, mensaje } = req.body || {};
    if (!nombre || !String(nombre).trim()) throw new HttpError(400, 'nombre es obligatorio');
    if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, 'email inválido');
    if (!mensaje || String(mensaje).trim().length < 10) throw new HttpError(400, 'El mensaje debe tener al menos 10 caracteres');
    const m = MensajeModel.create({
      nombre: String(nombre).trim().slice(0, 120),
      email: String(email).trim().slice(0, 160),
      telefono: telefono ? String(telefono).slice(0, 30) : null,
      asunto: String(asunto || 'Información general').slice(0, 120),
      mensaje: String(mensaje).trim().slice(0, 2000),
    });
    socketService.emitir(socketService.SALAS.ADMIN, 'mensaje_contacto', m);
    res.status(201).json({ ok: true, id: m.id });
  },
};
