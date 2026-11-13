const pedidosService = require('../servicios/pedidos.service');

/** Quita campos internos (promesa del recibo) antes de responder. */
const publico = ({ recibo, ...pedido }) => pedido; // eslint-disable-line no-unused-vars

module.exports = {
  /** POST /api/pedidos/cotizar  { items } -> importes y faltantes, sin guardar */
  cotizar: (req, res) => res.json(pedidosService.cotizar((req.body || {}).items)),

  /** POST /api/pedidos  -> 201 creado | 200 duplicado (idempotente) | 409 sin stock */
  crear(req, res) {
    const pedido = pedidosService.crear(req.user, req.body || {});
    res.status(pedido.duplicado ? 200 : 201).json(publico(pedido));
  },

  /** GET /api/pedidos?estado=PENDIENTE  (el cliente solo ve los suyos) */
  listar: (req, res) => res.json(pedidosService.listar(req.user, req.query)),

  /** GET /api/pedidos/:uuid */
  obtener: (req, res) => res.json(pedidosService.obtener(req.params.uuid, req.user)),

  /** PATCH /api/pedidos/:uuid/estado  { estado: 'EN_RUTA' | 'ENTREGADO' } */
  cambiarEstado(req, res) {
    const { estado, chofer, vehiculo, fecha_estimada } = req.body || {};
    res.json(pedidosService.cambiarEstado(req.params.uuid, estado, req.user, { chofer, vehiculo, fecha_estimada }));
  },

  /** GET /api/pedidos/:uuid/recibo  -> HTML del recibo */
  recibo(req, res) {
    res.type('html').send(pedidosService.reciboHtml(req.params.uuid, req.user));
  },
};
